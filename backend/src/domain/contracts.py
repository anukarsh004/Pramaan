"""Validated domain contracts shared by persistence and HTTP boundaries."""

from enum import StrEnum
from typing import Literal, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, JsonValue, model_validator


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class Role(StrEnum):
    OFFICER = "OFFICER"
    ADMIN = "ADMIN"
    BIDDER = "BIDDER"
    VIGILANCE = "VIGILANCE"


class CaseStatus(StrEnum):
    INTAKE_PENDING = "intake_pending"
    INTAKE_COMPLETE = "intake_complete"
    PROCESSING = "processing"
    READY = "ready_for_review"
    CLOSED = "closed"
    REOPENED = "reopened"


class CheckResult(StrEnum):
    PASS = "pass"
    FAIL = "fail"
    PENDING = "pending"
    NOT_EVALUATED = "not_evaluated"


class Severity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class DecisionValue(StrEnum):
    QUALIFY = "qualify"
    DISQUALIFY = "disqualify"
    REQUEST_MORE_INFO = "request_more_info"


class RuleCondition(Contract):
    field: str = Field(min_length=1, max_length=100, pattern=r"^[a-z][a-z0-9_]*$")
    op: Literal["IN", "EQ", "EQUALS", "GTE", "LTE"]
    value: JsonValue

    @model_validator(mode="after")
    def validate_value(self) -> Self:
        if self.value is None or isinstance(self.value, dict):
            raise ValueError("A condition requires a scalar value or a non-empty IN list.")
        if self.op == "IN":
            if not isinstance(self.value, list) or not self.value:
                raise ValueError("IN requires at least one value.")
            if any(value is None or isinstance(value, (dict, list)) for value in self.value):
                raise ValueError("IN values must be scalars.")
        elif isinstance(self.value, list):
            raise ValueError("Only IN accepts a list.")
        if self.op in {"GTE", "LTE"} and (
            isinstance(self.value, bool) or not isinstance(self.value, (int, float))
        ):
            raise ValueError("Numeric comparisons require a numeric threshold.")
        if isinstance(self.value, float):
            import math

            if not math.isfinite(self.value):
                raise ValueError("A threshold must be finite.")
        return self


class RuleInput(Contract):
    check_type_id: UUID
    condition: RuleCondition
    is_mandatory: bool = True
    severity_if_fail: Severity = Severity.HIGH


class ScoringPolicy(Contract):
    weights: dict[UUID, float]
    penalties: dict[Severity, float]
    low_risk_min: float = Field(ge=0, le=100)
    medium_risk_min: float = Field(ge=0, le=100)

    @model_validator(mode="after")
    def validate_policy(self) -> Self:
        import math

        if not self.weights or any(
            not math.isfinite(weight) or weight <= 0 for weight in self.weights.values()
        ):
            raise ValueError("Every configured rule must have a positive finite weight.")
        if set(self.penalties) != set(Severity):
            raise ValueError("Specify an anomaly penalty for every severity.")
        if any(not math.isfinite(value) or value < 0 for value in self.penalties.values()):
            raise ValueError("Penalties must be finite and non-negative.")
        if self.medium_risk_min >= self.low_risk_min:
            raise ValueError("Low-risk cutoff must exceed the medium-risk cutoff.")
        return self


class RuleSetInput(Contract):
    rules: list[RuleInput] = Field(min_length=1, max_length=100)
    scoring_policy: ScoringPolicy | None = None

    @model_validator(mode="after")
    def validate_rules(self) -> Self:
        ids = [rule.check_type_id for rule in self.rules]
        if len(set(ids)) != len(ids):
            raise ValueError("Configure each check type once per rule set.")
        if self.scoring_policy and set(self.scoring_policy.weights) != set(ids):
            raise ValueError("Policy weights must match the configured check types exactly.")
        return self


class DecisionInput(Contract):
    decision_value: DecisionValue
    remarks: str = Field(default="", max_length=2000)
    overrode_ai_recommendation: bool | None = None


class CaseInput(Contract):
    tender_id: UUID
    bidder_id: UUID


class RemarksInput(Contract):
    remarks: str = Field(min_length=10, max_length=2000)


class EvaluatedCheck(Contract):
    check_type_id: UUID
    result: CheckResult
    mandatory: bool


class ScoreResult(Contract):
    overall_score: int | None
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "INCOMPLETE"]
    pending_checks: int
    score_breakdown: dict[str, JsonValue]
