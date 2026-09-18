from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.entities import BidApplication


class ApplicationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, application_id: UUID) -> BidApplication | None:
        return await self.session.get(BidApplication, application_id)

    async def list_by_status(self, status: str) -> Sequence[BidApplication]:
        stmt = select(BidApplication).where(BidApplication.status == status)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create(self, application: BidApplication) -> BidApplication:
        self.session.add(application)
        await self.session.flush()
        return application

    async def update(self, application: BidApplication) -> BidApplication:
        self.session.add(application)
        await self.session.flush()
        return application

    async def get_by_tender_bidder(self, tender_id: UUID, bidder_id: UUID) -> BidApplication | None:
        stmt = select(BidApplication).where(
            BidApplication.tender_id == tender_id,
            BidApplication.bidder_id == bidder_id,
            BidApplication.status != "closed"
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
