"""Case lifecycle operations with explicit assignments and transactional audit."""

from datetime import datetime
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.controllers.dependencies import Principal
from src.domain.contracts import CaseInput, CaseStatus, Role
from src.models.entities import Assignment, BidApplication, Bidder, Tender
from src.repositories.audit import append_event
from src.repositories.cases import get_case


async def create_case(session: AsyncSession, actor: Principal, body: CaseInput) -> BidApplication:
    if actor.role != Role.OFFICER:
        raise HTTPException(403)
    assignment = await session.get(Assignment, (body.tender_id, actor.id))
    if assignment is None:
        raise HTTPException(403)
    tender = await session.get(Tender, body.tender_id, with_for_update=True)
    bidder = await session.get(Bidder, body.bidder_id)
    if tender is None or bidder is None or tender.deleted_at or bidder.deleted_at:
        raise HTTPException(404)
    if tender.eligibility_rule_set_id is None:
        raise HTTPException(409)
    if tender.closing_date < datetime.now(ZoneInfo("Asia/Kolkata")).date():
        raise HTTPException(409)
    duplicate = await session.scalar(select(BidApplication.id).where(
        BidApplication.bidder_id == body.bidder_id, BidApplication.tender_id == body.tender_id,
        BidApplication.status != CaseStatus.CLOSED,
    ))
    if duplicate:
        raise HTTPException(409)
    application = BidApplication(
        id=uuid4(), bidder_id=body.bidder_id, tender_id=body.tender_id,
        rule_set_id=tender.eligibility_rule_set_id, status=CaseStatus.INTAKE_PENDING,
    )
    session.add(application)
    await session.flush()
    await append_event(session, application.id, str(actor.id), "CASE_CREATED", None,
                       {"status": application.status})
    return application


async def reopen_case(
    session: AsyncSession, identifier: UUID, actor: Principal, remarks: str
) -> None:
    if actor.role != Role.OFFICER:
        raise HTTPException(403)
    case = await get_case(session, identifier, actor, lock=True)
    if case.status != CaseStatus.CLOSED or len(remarks.strip()) < 10:
        raise HTTPException(409)
    await session.get(Tender, case.tender_id, with_for_update=True)
    duplicate = await session.scalar(select(BidApplication.id).where(
        BidApplication.tender_id == case.tender_id, BidApplication.bidder_id == case.bidder_id,
        BidApplication.status != CaseStatus.CLOSED, BidApplication.id != case.id,
    ))
    if duplicate:
        raise HTTPException(409)
    case.status = CaseStatus.REOPENED
    case.closed_at = None
    await append_event(session, identifier, str(actor.id), "CASE_REOPENED", {"status": "closed"},
                       {"status": "reopened", "remarks": remarks.strip()})


async def request_clarification(
    session: AsyncSession, identifier: UUID, actor: Principal, remarks: str
) -> None:
    if actor.role != Role.OFFICER:
        raise HTTPException(403)
    case = await get_case(session, identifier, actor, lock=True)
    if case.status == CaseStatus.CLOSED or len(remarks.strip()) < 10:
        raise HTTPException(409)
    await append_event(session, identifier, str(actor.id), "CLARIFICATION_REQUESTED", None,
                       {"remarks": remarks.strip()})
