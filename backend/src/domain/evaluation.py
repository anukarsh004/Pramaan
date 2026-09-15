"""Deterministic evaluation without network, database, or AI dependencies."""

import math
from decimal import ROUND_HALF_UP, Decimal

from pydantic import JsonValue

from src.domain.contracts import (
    CheckResult,
    EvaluatedCheck,
    RuleCondition,
    ScoreResult,
    ScoringPolicy,
    Severity,
)


def same_value(left: JsonValue, right: JsonValue) -> bool:
    if isinstance(left, bool) or isinstance(right, bool):
        return type(left) is type(right) and left == right
    return left == right


def evaluate_rule(
    condition: RuleCondition,
    fields: dict[str, JsonValue],
    *,
    adapter_configured: bool,
    source_available: bool,
) -> CheckResult:
    if not adapter_configured:
        return CheckResult.NOT_EVALUATED
    if not source_available:
        return CheckResult.PENDING
    actual = fields.get(condition.field)
    if actual is None or isinstance(actual, (list, dict)):
        return CheckResult.PENDING
    if condition.op == "IN":
        assert isinstance(condition.value, list)
        passed = any(same_value(actual, candidate) for candidate in condition.value)
    elif condition.op in {"EQ", "EQUALS"}:
        if isinstance(actual, str) != isinstance(condition.value, str):
            return CheckResult.PENDING
        passed = same_value(actual, condition.value)
    else:
        expected = condition.value
        if (
            isinstance(actual, bool)
            or not isinstance(actual, (int, float))
            or not math.isfinite(actual)
        ):
            return CheckResult.PENDING
        assert isinstance(expected, (int, float))
        passed = actual >= expected if condition.op == "GTE" else actual <= expected
    return CheckResult.PASS if passed else CheckResult.FAIL


def compute_score(
    checks: list[EvaluatedCheck], anomalies: list[Severity], policy: ScoringPolicy | None
) -> ScoreResult:
    pending = sum(
        check.result in {CheckResult.PENDING, CheckResult.NOT_EVALUATED} for check in checks
    )
    incomplete = ScoreResult(
        overall_score=None,
        risk_level="INCOMPLETE",
        pending_checks=pending,
        score_breakdown={"reason": "A complete check set and explicit scoring policy are required."},
    )
    if policy is None or not checks:
        return incomplete
    ids = [check.check_type_id for check in checks]
    if len(ids) != len(set(ids)) or set(ids) != set(policy.weights):
        raise ValueError("Checks must match the policy exactly without duplicates.")
    if any(
        check.mandatory and check.result in {CheckResult.PENDING, CheckResult.NOT_EVALUATED}
        for check in checks
    ) or pending == len(checks):
        return incomplete
    total = sum(Decimal(str(weight)) for weight in policy.weights.values())
    contributions: dict[str, JsonValue] = {}
    earned = Decimal(0)
    for check in checks:
        contribution = (
            Decimal(str(policy.weights[check.check_type_id])) * 100 / total
            if check.result == CheckResult.PASS
            else Decimal(0)
        )
        earned += contribution
        contributions[str(check.check_type_id)] = float(contribution)
    penalty = sum(Decimal(str(policy.penalties[severity])) for severity in anomalies)
    score = int(max(Decimal(0), earned - penalty).quantize(Decimal(1), rounding=ROUND_HALF_UP))
    risk = "LOW" if score >= policy.low_risk_min else "MEDIUM"
    if score < policy.medium_risk_min:
        risk = "HIGH"
    return ScoreResult(
        overall_score=score,
        risk_level=risk,
        pending_checks=pending,
        score_breakdown={"contributions": contributions, "anomaly_penalty": float(penalty)},
    )
