from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.entities import Bidder


class BidderRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, bidder_id: UUID) -> Bidder | None:
        return await self.session.get(Bidder, bidder_id)

    async def get_by_user_id(self, user_id: UUID) -> Bidder | None:
        stmt = select(Bidder).where(Bidder.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_pan(self, pan_number: str) -> Bidder | None:
        stmt = select(Bidder).where(Bidder.pan_number == pan_number)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, bidder: Bidder) -> Bidder:
        self.session.add(bidder)
        await self.session.flush()
        return bidder
