"""Intelligence endpoints: bid-rigging, doc tamper, health check, cross-tender."""

from fastapi import APIRouter, HTTPException
from pydantic import JsonValue

from src.controllers.dependencies import Actor
from src.domain.contracts import Role

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


def require_intel_access(actor: Actor) -> None:
    if actor.role not in {Role.OFFICER, Role.ADMIN, Role.VIGILANCE}:
        raise HTTPException(403)


# ── Bid-Rigging ──


@router.get("/bid-rigging")
async def bid_rigging_analysis(
    actor: Actor, tender_id: str | None = None
) -> dict[str, JsonValue]:
    require_intel_access(actor)
    from src.services.bid_rigging import analyze_bid_rigging

    report = analyze_bid_rigging(tender_id)
    return {"success": True, "data": report.model_dump(mode="json")}


# ── Document Tamper ──


@router.get("/doc-tamper/{application_id}")
async def doc_tamper_analysis(
    application_id: str, actor: Actor
) -> dict[str, JsonValue]:
    require_intel_access(actor)
    from src.services.doc_tamper import analyze_document_tamper

    report = analyze_document_tamper(application_id)
    return {"success": True, "data": report.model_dump(mode="json")}


# ── Health Check ──


@router.get("/health-check/{application_id}")
async def health_check(
    application_id: str, actor: Actor
) -> dict[str, JsonValue]:
    # Bidders can also check their own health
    if actor.role not in {Role.OFFICER, Role.ADMIN, Role.VIGILANCE, Role.BIDDER}:
        raise HTTPException(403)
    from src.services.health_check import run_health_check

    result = run_health_check(application_id)
    return {"success": True, "data": result.model_dump(mode="json")}


# ── Cross-Tender Intelligence ──


@router.get("/cross-tender/{bidder_id}")
async def cross_tender_intel(
    bidder_id: str, actor: Actor
) -> dict[str, JsonValue]:
    require_intel_access(actor)
    from src.services.cross_tender import get_cross_tender_report

    report = get_cross_tender_report(bidder_id)
    return {"success": True, "data": report.model_dump(mode="json")}
