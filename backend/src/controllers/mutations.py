"""Case mutation routes; business behavior is implemented by services."""

from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import JsonValue

from src.controllers.dependencies import Actor, Session, require_csrf
from src.domain.contracts import CaseInput, DecisionInput, RemarksInput
from src.services.cases import create_case, reopen_case, request_clarification
from src.services.decisions import record_decision

router = APIRouter(dependencies=[Depends(require_csrf)])


@router.post("/bid-applications", status_code=201)
async def create_application(body: CaseInput, session: Session, actor: Actor) -> dict[str, JsonValue]:
    case = await create_case(session, actor, body)
    return {"success": True, "application_id": str(case.id), "status": case.status}


@router.post("/bid-applications/{identifier}/decision")
async def decide(
    identifier: UUID, body: DecisionInput, session: Session, actor: Actor
) -> dict[str, JsonValue]:
    decision = await record_decision(session, identifier, actor, body)
    return {"success": True, "decision_id": str(decision.id), "case_status": "closed"}


@router.post("/bid-applications/{identifier}/reopen")
async def reopen(
    identifier: UUID, body: RemarksInput, session: Session, actor: Actor
) -> dict[str, JsonValue]:
    await reopen_case(session, identifier, actor, body.remarks)
    return {"success": True, "case_status": "reopened"}


@router.post("/bid-applications/{identifier}/clarification")
async def clarify(
    identifier: UUID, body: RemarksInput, session: Session, actor: Actor
) -> dict[str, JsonValue]:
    await request_clarification(session, identifier, actor, body.remarks)
    return {"success": True}
