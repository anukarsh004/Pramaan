"""Bidder-specific routes for viewing tenders, applications, and uploading documents."""

from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import JsonValue
from sqlalchemy import select

from src.controllers.dependencies import Actor, Session
from src.domain.contracts import Role
from src.models.entities import BidApplication, Bidder, Document, Tender

router = APIRouter(prefix="/bidder", tags=["bidder"])


def require_bidder(actor: Actor) -> None:
    if actor.role != Role.BIDDER:
        raise HTTPException(403)


@router.get("/my-tenders")
async def my_tenders(session: Session, actor: Actor) -> dict[str, JsonValue]:
    """List tenders the bidder has applications for."""
    require_bidder(actor)

    # Find bidder profile linked to this user
    bidder = await session.scalar(select(Bidder).where(Bidder.user_id == actor.id))
    if bidder is None:
        return {"success": True, "data": []}

    # Get tenders with applications
    applications = (
        await session.scalars(
            select(BidApplication)
            .where(BidApplication.bidder_id == bidder.id, BidApplication.deleted_at.is_(None))
            .order_by(BidApplication.created_at.desc())
        )
    ).all()

    result = []
    for app in applications:
        tender = await session.get(Tender, app.tender_id)
        if tender:
            result.append(
                {
                    "application_id": str(app.id),
                    "tender_id": str(tender.id),
                    "tender_title": tender.title,
                    "gem_bid_number": tender.gem_bid_number,
                    "closing_date": tender.closing_date.isoformat(),
                    "status": app.status,
                    "submitted_at": app.submitted_at.isoformat() if app.submitted_at else None,
                }
            )

    return {"success": True, "data": result}


@router.get("/applications/{application_id}")
async def my_application_detail(
    application_id: UUID, session: Session, actor: Actor
) -> dict[str, JsonValue]:
    """Get detailed view of a bidder's own application."""
    require_bidder(actor)

    bidder = await session.scalar(select(Bidder).where(Bidder.user_id == actor.id))
    if bidder is None:
        raise HTTPException(404)

    application = await session.get(BidApplication, application_id)
    if application is None or application.bidder_id != bidder.id:
        raise HTTPException(404)

    tender = await session.get(Tender, application.tender_id)
    documents = (
        await session.scalars(
            select(Document)
            .where(Document.application_id == application_id)
            .order_by(Document.doc_type, Document.version.desc())
        )
    ).all()

    return {
        "success": True,
        "data": {
            "id": str(application.id),
            "status": application.status,
            "tender_title": tender.title if tender else "Unavailable",
            "submitted_at": application.submitted_at.isoformat()
            if application.submitted_at
            else None,
            "documents": [
                {
                    "id": str(doc.id),
                    "doc_type": doc.doc_type,
                    "version": doc.version,
                    "extraction_status": doc.extraction_status,
                    "extraction_confidence": float(doc.extraction_confidence)
                    if doc.extraction_confidence
                    else None,
                }
                for doc in documents
            ],
        },
    }


@router.get("/available-tenders")
async def available_tenders(session: Session, actor: Actor) -> dict[str, JsonValue]:
    """List open tenders the bidder can apply to."""
    require_bidder(actor)
    from datetime import date
    from zoneinfo import ZoneInfo

    today = date.today()
    rows = (
        await session.scalars(
            select(Tender)
            .where(Tender.deleted_at.is_(None), Tender.closing_date >= today)
            .order_by(Tender.closing_date.asc())
            .limit(50)
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
            }
            for t in rows
        ],
    }
