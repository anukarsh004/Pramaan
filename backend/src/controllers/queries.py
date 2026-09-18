"""Read endpoints for the officer, bidder and vigilance workspaces."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import JsonValue
from sqlalchemy import func, select

from src.controllers.dependencies import Actor, Session
from src.domain.contracts import Role
from src.models.entities import (
    Assignment, AuditEvent, BidApplication, Bidder, CheckType, ComplianceCheck,
    ComplianceScore, Decision, Document, EligibilityRule, Recommendation, Tender,
)
from src.repositories.audit import verify_events
from src.repositories.cases import get_case, scoped_cases

router = APIRouter()


@router.get("/auth/session")
async def profile(request: Request, actor: Actor) -> dict[str, JsonValue]:
    cookie_csrf = request.cookies.get("csrf_token") or "dev-csrf-token"
    return {"success": True, "data": {
        "id": str(actor.id), "full_name": actor.full_name, "role": actor.role,
        "csrf_token": cookie_csrf,
    }}


@router.get("/tenders")
async def tenders(session: Session, actor: Actor) -> dict[str, JsonValue]:
    query = select(Tender).where(Tender.deleted_at.is_(None))
    if actor.role == Role.OFFICER:
        query = query.where(Tender.id.in_(
            select(Assignment.tender_id).where(Assignment.officer_id == actor.id)
        ))
    rows = (await session.scalars(query.order_by(Tender.closing_date.desc()).limit(100))).all()
    return {"success": True, "data": [
        {"id": str(row.id), "title": row.title, "gem_bid_number": row.gem_bid_number,
         "category": row.category, "closing_date": row.closing_date.isoformat()}
        for row in rows
    ]}


@router.get("/check-types")
async def check_types(session: Session, actor: Actor) -> dict[str, JsonValue]:
    if actor.role not in {Role.ADMIN, Role.OFFICER}:
        raise HTTPException(403)
    rows = (await session.scalars(select(CheckType).order_by(CheckType.name))).all()
    return {"success": True, "data": [
        {"id": str(row.id), "name": row.name, "source_system": row.source_system}
        for row in rows
    ]}


@router.get("/bid-applications")
async def applications(
    session: Session, actor: Actor,
    tender_id: UUID | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    q: Annotated[str, Query(max_length=200)] = "",
) -> dict[str, JsonValue]:
    query = scoped_cases(actor)
    if tender_id:
        query = query.where(BidApplication.tender_id == tender_id)
    if q.strip():
        query = query.where(BidApplication.bidder_id.in_(
            select(Bidder.id).where(Bidder.legal_name.icontains(q.strip(), autoescape=True))
        ))
    count = await session.scalar(select(func.count()).select_from(query.subquery()))
    joined = (
        query.add_columns(Bidder.legal_name, Tender.title, ComplianceScore.overall_score,
                          ComplianceScore.risk_level)
        .join(Bidder, Bidder.id == BidApplication.bidder_id)
        .join(Tender, Tender.id == BidApplication.tender_id)
        .outerjoin(ComplianceScore, ComplianceScore.application_id == BidApplication.id)
        .order_by(BidApplication.created_at.desc(), BidApplication.id)
        .offset((page - 1) * limit).limit(limit)
    )
    rows = (await session.execute(joined)).all()
    return {"success": True, "page": page, "limit": limit, "total": count or 0, "data": [
        {"id": str(case.id), "bidder_name": name, "tender_title": title,
         "status": case.status, "overall_score": score, "risk_level": risk or "INCOMPLETE",
         "submitted_at": case.submitted_at.isoformat() if case.submitted_at else None}
        for case, name, title, score, risk in rows
    ]}


@router.get("/bid-applications/{identifier}")
async def case_detail(identifier: UUID, session: Session, actor: Actor) -> dict[str, JsonValue]:
    application = await get_case(session, identifier, actor)
    bidder = await session.get(Bidder, application.bidder_id)
    tender = await session.get(Tender, application.tender_id)
    documents = (await session.scalars(
        select(Document).where(Document.application_id == identifier)
        .order_by(Document.doc_type, Document.version.desc())
    )).all()
    data: dict[str, JsonValue] = {
        "id": str(application.id), "status": application.status,
        "bidder_name": bidder.legal_name if bidder else "Unavailable",
        "tender_title": tender.title if tender else "Unavailable",
        "documents": [{"id": str(doc.id), "doc_type": doc.doc_type, "version": doc.version,
                       "extraction_status": doc.extraction_status} for doc in documents],
    }
    if actor.role == Role.BIDDER and application.status != "closed":
        return {"success": True, "data": data}
    checks = (await session.execute(
        select(ComplianceCheck, CheckType.name).join(CheckType)
        .where(ComplianceCheck.application_id == identifier)
        .order_by(ComplianceCheck.checked_at.desc())
    )).all()
    score = await session.scalar(select(ComplianceScore).where(
        ComplianceScore.application_id == identifier
    ))
    recommendation = await session.scalar(select(Recommendation).where(
        Recommendation.application_id == identifier
    ).order_by(Recommendation.generated_at.desc()).limit(1))
    decisions = (await session.scalars(select(Decision).where(
        Decision.application_id == identifier
    ).order_by(Decision.decided_at.desc()))).all()
    data.update({
        "checks": [{"id": str(check.id), "name": name, "result": check.result,
                    "source": check.source, "severity": check.severity,
                    "evidence": check.evidence} for check, name in checks],
        "score": {"overall_score": score.overall_score, "risk_level": score.risk_level,
                  "score_breakdown": score.score_breakdown} if score else None,
        "recommendation": {"text": recommendation.recommendation_text,
                           "suggested_action": recommendation.suggested_action,
                           "model_used": recommendation.model_used} if recommendation else None,
        "decisions": [{"id": str(decision.id), "decision_value": decision.decision_value,
                       "remarks": decision.remarks, "decided_at": decision.decided_at.isoformat()}
                      for decision in decisions],
    })
    return {"success": True, "data": data}


@router.get("/audit/{identifier}")
async def audit_trail(identifier: UUID, session: Session, actor: Actor) -> dict[str, JsonValue]:
    if actor.role not in {Role.OFFICER, Role.VIGILANCE}:
        raise HTTPException(403)
    await get_case(session, identifier, actor)
    events = list((await session.scalars(select(AuditEvent).where(
        AuditEvent.application_id == identifier
    ).order_by(AuditEvent.event_at, AuditEvent.id))).all())
    return {"success": True, "data": {"chain_verified": verify_events(events), "events": [
        {"id": str(event.id), "actor": event.actor, "action": event.action,
         "before_state": event.before_state, "after_state": event.after_state,
         "event_at": event.event_at.isoformat(), "event_hash": event.event_hash}
        for event in events
    ]}}


@router.get("/tenders/{identifier}/eligibility-rules")
async def tender_rules(identifier: UUID, session: Session, actor: Actor) -> dict[str, JsonValue]:
    if actor.role not in {Role.ADMIN, Role.OFFICER}:
        raise HTTPException(403)
    if actor.role == Role.OFFICER and await session.get(Assignment, (identifier, actor.id)) is None:
        raise HTTPException(403)
    tender = await session.get(Tender, identifier)
    if tender is None:
        raise HTTPException(404)
    rows = (await session.execute(select(EligibilityRule, CheckType.name).join(CheckType)
        .where(EligibilityRule.rule_set_id == tender.eligibility_rule_set_id))).all()
    return {"success": True, "data": [
        {"id": str(rule.id), "check_type_id": str(rule.check_type_id), "name": name,
         "condition": rule.condition, "is_mandatory": rule.is_mandatory,
         "severity_if_fail": rule.severity_if_fail} for rule, name in rows
    ]}
