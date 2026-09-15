"""Pure workflow invariants, enforced again inside persistent transactions."""

from src.domain.contracts import CaseStatus, DecisionInput, DecisionValue

TRANSITIONS: dict[CaseStatus, frozenset[CaseStatus]] = {
    CaseStatus.INTAKE_PENDING: frozenset({CaseStatus.INTAKE_COMPLETE}),
    CaseStatus.INTAKE_COMPLETE: frozenset({CaseStatus.PROCESSING}),
    CaseStatus.PROCESSING: frozenset({CaseStatus.READY}),
    CaseStatus.READY: frozenset({CaseStatus.PROCESSING, CaseStatus.CLOSED}),
    CaseStatus.CLOSED: frozenset({CaseStatus.REOPENED}),
    CaseStatus.REOPENED: frozenset({CaseStatus.INTAKE_COMPLETE}),
}


def validate_transition(current: CaseStatus, target: CaseStatus) -> None:
    if target not in TRANSITIONS[current]:
        raise ValueError(f"Transition from {current} to {target} is not permitted.")


def validate_decision(
    status: CaseStatus, decision: DecisionInput, recommendation: DecisionValue | None
) -> bool:
    validate_transition(status, CaseStatus.CLOSED)
    overridden = recommendation is not None and decision.decision_value != recommendation
    if decision.overrode_ai_recommendation is not None:
        if decision.overrode_ai_recommendation != overridden:
            raise ValueError("Override flag does not match the recorded recommendation.")
    if overridden or decision.decision_value == DecisionValue.DISQUALIFY:
        if len(decision.remarks.strip()) < 10:
            raise ValueError("Provide at least 10 characters explaining this decision.")
    return overridden
