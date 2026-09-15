"""Scoped case queries; callers cannot request an unscoped bidder view."""

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.controllers.dependencies import Principal
from src.domain.contracts import Role
from src.models.entities import Assignment, BidApplication, Bidder


def scoped_cases(actor: Principal) -> Select[tuple[BidApplication]]:
    query = select(BidApplication).where(BidApplication.deleted_at.is_(None))
    if actor.role == Role.OFFICER:
        return query.where(
            BidApplication.tender_id.in_(
                select(Assignment.tender_id).where(Assignment.officer_id == actor.id)
            )
        )
    if actor.role == Role.BIDDER:
        return query.where(
            BidApplication.bidder_id.in_(select(Bidder.id).where(Bidder.user_id == actor.id))
        )
    if actor.role == Role.VIGILANCE:
        return query
    raise HTTPException(403)


async def get_case(
    session: AsyncSession, identifier: UUID, actor: Principal, *, lock: bool = False
) -> BidApplication:
    query = scoped_cases(actor).where(BidApplication.id == identifier)
    if lock:
        query = query.with_for_update()
    application = await session.scalar(query)
    if application is None:
        raise HTTPException(404)
    return application
