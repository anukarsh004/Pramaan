from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.controllers.dependencies import Principal
from src.domain.contracts import Role
from src.models.entities import Bidder
from src.repositories.bidder_repo import BidderRepository


async def create_bidder(
    session: AsyncSession, actor: Principal, legal_name: str, pan_number: str, gstin: str | None, udyam_number: str | None, cin: str | None, registered_address: str | None, user_id: UUID | None
) -> Bidder:
    if actor.role != Role.ADMIN:
        raise HTTPException(403)
    repo = BidderRepository(session)
    bidder = Bidder(
        id=uuid4(),
        legal_name=legal_name,
        pan_number=pan_number,
        gstin=gstin,
        udyam_number=udyam_number,
        cin=cin,
        registered_address=registered_address,
        user_id=user_id,
    )
    return await repo.create(bidder)
