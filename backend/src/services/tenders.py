from datetime import date
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.controllers.dependencies import Principal
from src.domain.contracts import Role
from src.models.entities import Tender, Assignment, RuleSet
from src.repositories.tender_repo import TenderRepository

async def create_tender(
    session: AsyncSession, actor: Principal, gem_bid_number: str, title: str, category: str, estimated_value: float | None, closing_date: date
) -> Tender:
    if actor.role != Role.ADMIN:
        raise HTTPException(403)
    
    repo = TenderRepository(session)
    tender = Tender(
        id=uuid4(),
        gem_bid_number=gem_bid_number,
        title=title,
        category=category,
        estimated_value=estimated_value,
        closing_date=closing_date,
        created_by=actor.id,
    )
    return await repo.create(tender)

async def assign_rule_set_to_tender(
    session: AsyncSession, actor: Principal, tender_id: UUID, rule_set_id: UUID
) -> None:
    if actor.role != Role.ADMIN:
        raise HTTPException(403)
    repo = TenderRepository(session)
    tender = await repo.get_by_id(tender_id)
    if tender is None:
        raise HTTPException(404)
    # Check rule set
    rs = await session.get(RuleSet, rule_set_id)
    if rs is None:
        raise HTTPException(404)
    tender.eligibility_rule_set_id = rule_set_id

async def assign_officer_to_tender(
    session: AsyncSession, actor: Principal, tender_id: UUID, officer_id: UUID
) -> None:
    if actor.role != Role.ADMIN:
        raise HTTPException(403)
    repo = TenderRepository(session)
    tender = await repo.get_by_id(tender_id)
    if tender is None:
        raise HTTPException(404)
    existing = await session.get(Assignment, (tender_id, officer_id))
    if existing:
        return
    assignment = Assignment(tender_id=tender_id, officer_id=officer_id)
    session.add(assignment)
