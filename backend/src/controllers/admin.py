"""Admin routes for tender, check-type, rule-set, and user management."""

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, JsonValue
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.controllers.dependencies import Actor, Session, require_csrf
from src.domain.contracts import Role, RuleSetInput, Severity
from src.models.entities import (
    Bidder,
    CheckType,
    EligibilityRule,
    RuleSet,
    Tender,
    User,
)

router = APIRouter(prefix="/admin", tags=["admin"])


class TenderCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    gem_bid_number: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=300)
    category: str = Field(min_length=1, max_length=200)
    estimated_value: float | None = None
    closing_date: str  # ISO date


class CheckTypeCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=100)
    source_system: str = Field(min_length=1, max_length=30)
    mandatory: bool = True


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    keycloak_sub: str = Field(min_length=1, max_length=255)
    email: str = Field(min_length=1, max_length=320)
    full_name: str = Field(min_length=1, max_length=200)
    role: str = Field(min_length=1, max_length=20)


class BidderCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    legal_name: str = Field(min_length=1, max_length=300)
    pan_number: str = Field(min_length=1)
    gstin: str | None = None
    udyam_number: str | None = None
    cin: str | None = None
    registered_address: str | None = None
    user_id: UUID | None = None


def require_admin(actor: Actor) -> None:
    if actor.role != Role.ADMIN:
        raise HTTPException(403)


@router.post("/tenders", status_code=201, dependencies=[Depends(require_csrf)])
async def create_tender(
    body: TenderCreate, session: Session, actor: Actor
) -> dict[str, JsonValue]:
    require_admin(actor)
    from datetime import date

    tender = Tender(
        id=uuid4(),
        gem_bid_number=body.gem_bid_number,
        title=body.title,
        category=body.category,
        estimated_value=body.estimated_value,
        closing_date=date.fromisoformat(body.closing_date),
        created_by=actor.id,
    )
    session.add(tender)
    await session.flush()
    return {"success": True, "id": str(tender.id), "title": tender.title}


@router.get("/tenders")
async def list_tenders(session: Session, actor: Actor) -> dict[str, JsonValue]:
    require_admin(actor)
    rows = (
        await session.scalars(
            select(Tender).where(Tender.deleted_at.is_(None)).order_by(Tender.closing_date.desc())
        )
    ).all()
    return {
        "success": True,
        "data": [
            {
                "id": str(t.id),
                "gem_bid_number": t.gem_bid_number,
                "title": t.title,
                "category": t.category,
                "closing_date": t.closing_date.isoformat(),
                "rule_set_id": str(t.eligibility_rule_set_id)
                if t.eligibility_rule_set_id
                else None,
            }
            for t in rows
        ],
    }


@router.post("/check-types", status_code=201, dependencies=[Depends(require_csrf)])
async def create_check_type(
    body: CheckTypeCreate, session: Session, actor: Actor
) -> dict[str, JsonValue]:
    require_admin(actor)
    ct = CheckType(
        id=uuid4(), name=body.name, source_system=body.source_system, mandatory=body.mandatory
    )
    session.add(ct)
    await session.flush()
    return {"success": True, "id": str(ct.id), "name": ct.name}


@router.get("/check-types")
async def list_check_types(session: Session, actor: Actor) -> dict[str, JsonValue]:
    require_admin(actor)
    rows = (await session.scalars(select(CheckType).order_by(CheckType.name))).all()
    return {
        "success": True,
        "data": [
            {
                "id": str(ct.id),
                "name": ct.name,
                "source_system": ct.source_system,
                "mandatory": ct.mandatory,
            }
            for ct in rows
        ],
    }


@router.post("/rule-sets", status_code=201, dependencies=[Depends(require_csrf)])
async def create_rule_set(
    body: RuleSetInput,
    session: Session,
    actor: Actor,
    tender_category: str = "default",
) -> dict[str, JsonValue]:
    require_admin(actor)
    existing = await session.scalar(
        select(RuleSet).where(
            RuleSet.tender_category == tender_category, RuleSet.is_active.is_(True)
        )
    )
    version = (existing.version + 1) if existing else 1
    rule_set = RuleSet(
        id=uuid4(),
        tender_category=tender_category,
        version=version,
        is_active=True,
        created_by=actor.id,
        scoring_policy=body.scoring_policy.model_dump(mode="json") if body.scoring_policy else None,
    )
    session.add(rule_set)
    await session.flush()
    for rule_input in body.rules:
        rule = EligibilityRule(
            id=uuid4(),
            rule_set_id=rule_set.id,
            check_type_id=rule_input.check_type_id,
            condition=rule_input.condition.model_dump(mode="json"),
            severity_if_fail=rule_input.severity_if_fail,
            is_mandatory=rule_input.is_mandatory,
        )
        session.add(rule)
    await session.flush()
    if existing:
        existing.is_active = False
    return {"success": True, "id": str(rule_set.id), "version": version}


@router.post("/users", status_code=201, dependencies=[Depends(require_csrf)])
async def create_user(body: UserCreate, session: Session, actor: Actor) -> dict[str, JsonValue]:
    require_admin(actor)
    user = User(
        id=uuid4(),
        keycloak_sub=body.keycloak_sub,
        email=body.email,
        full_name=body.full_name,
        role=body.role,
    )
    session.add(user)
    await session.flush()
    return {"success": True, "id": str(user.id)}


@router.get("/users")
async def list_users(session: Session, actor: Actor) -> dict[str, JsonValue]:
    require_admin(actor)
    rows = (
        await session.scalars(select(User).where(User.deleted_at.is_(None)).order_by(User.full_name))
    ).all()
    return {
        "success": True,
        "data": [
            {
                "id": str(u.id),
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role,
                "is_active": u.is_active,
            }
            for u in rows
        ],
    }


@router.post("/bidders", status_code=201, dependencies=[Depends(require_csrf)])
async def create_bidder(
    body: BidderCreate, session: Session, actor: Actor
) -> dict[str, JsonValue]:
    require_admin(actor)
    bidder = Bidder(
        id=uuid4(),
        legal_name=body.legal_name,
        pan_number=body.pan_number,
        gstin=body.gstin,
        udyam_number=body.udyam_number,
        cin=body.cin,
        registered_address=body.registered_address,
        user_id=body.user_id,
    )
    session.add(bidder)
    await session.flush()
    return {"success": True, "id": str(bidder.id)}


@router.post(
    "/tenders/{tender_id}/assign-rule-set",
    dependencies=[Depends(require_csrf)],
)
async def assign_rule_set(
    tender_id: UUID, rule_set_id: UUID, session: Session, actor: Actor
) -> dict[str, JsonValue]:
    require_admin(actor)
    tender = await session.get(Tender, tender_id)
    if tender is None:
        raise HTTPException(404)
    rs = await session.get(RuleSet, rule_set_id)
    if rs is None:
        raise HTTPException(404)
    tender.eligibility_rule_set_id = rule_set_id
    return {"success": True}


@router.post(
    "/tenders/{tender_id}/assign-officer",
    dependencies=[Depends(require_csrf)],
)
async def assign_officer(
    tender_id: UUID, officer_id: UUID, session: Session, actor: Actor
) -> dict[str, JsonValue]:
    require_admin(actor)
    from src.models.entities import Assignment

    tender = await session.get(Tender, tender_id)
    if tender is None:
        raise HTTPException(404)
    existing = await session.get(Assignment, (tender_id, officer_id))
    if existing:
        return {"success": True, "message": "Already assigned"}
    assignment = Assignment(tender_id=tender_id, officer_id=officer_id)
    session.add(assignment)
    await session.flush()
    return {"success": True}
