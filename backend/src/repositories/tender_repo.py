from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.entities import Tender


class TenderRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, tender_id: UUID) -> Tender | None:
        return await self.session.get(Tender, tender_id)

    async def get_by_gem_bid_number(self, bid_number: str) -> Tender | None:
        stmt = select(Tender).where(Tender.gem_bid_number == bid_number)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all(self, skip: int = 0, limit: int = 100) -> Sequence[Tender]:
        stmt = select(Tender).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create(self, tender: Tender) -> Tender:
        self.session.add(tender)
        await self.session.flush()
        return tender
