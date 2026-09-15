"""Officer decisions and audit append are committed or rolled back together."""

from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.controllers.dependencies import Principal
from src.domain.contracts import CaseStatus, DecisionInput, DecisionValue, Role
from src.domain.workflow import validate_decision
from src.models.entities import Decision, Recommendation, now
from src.repositories.audit import append_event
from src.repositories.cases import get_case


async def record_decision(
    session: AsyncSession, application_id: UUID, actor: Principal, body: DecisionInput
) -> Decision:
    if actor.role != Role.OFFICER:
        raise HTTPException(403)
    application = await get_case(session, application_id, actor, lock=True)
    recommendation = await session.scalar(
        select(Recommendation).where(Recommendation.application_id == application_id)
        .order_by(Recommendation.generated_at.desc()).limit(1)
    )
    try:
        overridden = validate_decision(
            CaseStatus(application.status), body,
            DecisionValue(recommendation.suggested_action) if recommendation else None,
        )
    except ValueError as exc:
        raise HTTPException(409 if application.status != CaseStatus.READY else 400) from exc
    decision = Decision(
        id=uuid4(), application_id=application_id, officer_id=actor.id,
        decision_value=body.decision_value, remarks=body.remarks.strip(),
        overrode_ai_recommendation=overridden,
    )
    session.add(decision)
    await session.flush()
    before = application.status
    application.status = CaseStatus.CLOSED
    application.closed_at = now()
    await append_event(
        session, application_id, str(actor.id), "DECISION_RECORDED",
        {"status": before},
        {"status": "closed", "decision_id": str(decision.id), "decision": body.decision_value,
         "remarks": body.remarks.strip(), "overrode_ai_recommendation": overridden},
    )
    return decision
