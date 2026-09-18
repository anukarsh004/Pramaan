"""Relational case model; binary evidence remains in object storage."""

from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from pydantic import JsonValue
from sqlalchemy import JSON, CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

json_type = JSON().with_variant(JSONB(), "postgresql")


def now() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class Entity(Base):
    __abstract__ = True
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class User(Entity):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(String(320), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(20), index=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    is_verified: Mapped[bool] = mapped_column(default=False)
    mfa_enabled: Mapped[bool] = mapped_column(default=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    failed_login_count: Mapped[int] = mapped_column(default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (CheckConstraint("role IN ('OFFICER','ADMIN','BIDDER','VIGILANCE')"),)


class RefreshTokenSession(Entity):
    __tablename__ = "refresh_token_sessions"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PasswordResetToken(Entity):
    __tablename__ = "password_reset_tokens"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class EmailVerificationToken(Entity):
    __tablename__ = "email_verification_tokens"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Bidder(Entity):
    __tablename__ = "bidders"
    legal_name: Mapped[str] = mapped_column(String(300))
    pan_number: Mapped[str] = mapped_column(Text, unique=True)
    gstin: Mapped[str | None] = mapped_column(String(15))
    udyam_number: Mapped[str | None] = mapped_column(String(30))
    cin: Mapped[str | None] = mapped_column(String(30))
    registered_address: Mapped[str | None] = mapped_column(Text)
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True)


class RuleSet(Entity):
    __tablename__ = "eligibility_rule_sets"
    tender_category: Mapped[str] = mapped_column(String(200))
    version: Mapped[int]
    is_active: Mapped[bool] = mapped_column(default=True)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    scoring_policy: Mapped[dict[str, JsonValue] | None] = mapped_column(json_type)


class Tender(Entity):
    __tablename__ = "tenders"
    gem_bid_number: Mapped[str] = mapped_column(String(64), unique=True)
    title: Mapped[str] = mapped_column(String(300))
    category: Mapped[str] = mapped_column(String(200))
    estimated_value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    eligibility_rule_set_id: Mapped[UUID | None] = mapped_column(ForeignKey("eligibility_rule_sets.id"))
    closing_date: Mapped[date] = mapped_column(index=True)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)


class Assignment(Base):
    __tablename__ = "tender_officers"
    tender_id: Mapped[UUID] = mapped_column(ForeignKey("tenders.id"), primary_key=True)
    officer_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), primary_key=True, index=True)


class CheckType(Entity):
    __tablename__ = "check_types"
    name: Mapped[str] = mapped_column(String(100), unique=True)
    source_system: Mapped[str] = mapped_column(String(30))
    mandatory: Mapped[bool] = mapped_column(default=True)


class EligibilityRule(Entity):
    __tablename__ = "eligibility_rules"
    rule_set_id: Mapped[UUID] = mapped_column(ForeignKey("eligibility_rule_sets.id"), index=True)
    check_type_id: Mapped[UUID] = mapped_column(ForeignKey("check_types.id"), index=True)
    condition: Mapped[dict[str, JsonValue]] = mapped_column(json_type)
    severity_if_fail: Mapped[str] = mapped_column(String(10))
    is_mandatory: Mapped[bool]
    __table_args__ = (Index("uq_rule_check", "rule_set_id", "check_type_id", unique=True),)


class BidApplication(Entity):
    __tablename__ = "bid_applications"
    bidder_id: Mapped[UUID] = mapped_column(ForeignKey("bidders.id"), index=True)
    tender_id: Mapped[UUID] = mapped_column(ForeignKey("tenders.id"), index=True)
    status: Mapped[str] = mapped_column(String(30), default="intake_pending", index=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rule_set_id: Mapped[UUID] = mapped_column(ForeignKey("eligibility_rule_sets.id"))
    __table_args__ = (
        Index("ix_bid_applications_created_at_id", "created_at", "id"),
        Index(
            "uq_active_application", "bidder_id", "tender_id", unique=True,
            postgresql_where=(status != "closed"),
        ),
        CheckConstraint(
            "status IN ('intake_pending','intake_complete','processing',"
            "'ready_for_review','closed','reopened')"
        ),
    )


class Document(Entity):
    __tablename__ = "documents"
    application_id: Mapped[UUID] = mapped_column(ForeignKey("bid_applications.id"), index=True)
    doc_type: Mapped[str] = mapped_column(String(30))
    version: Mapped[int]
    storage_uri: Mapped[str] = mapped_column(Text)
    extraction_status: Mapped[str] = mapped_column(String(30), default="pending")
    extracted_fields: Mapped[dict[str, JsonValue] | None] = mapped_column(json_type)
    extraction_confidence: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    uploaded_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (Index("uq_document_version", "application_id", "doc_type", "version", unique=True),)


class ComplianceCheck(Entity):
    __tablename__ = "compliance_checks"
    application_id: Mapped[UUID] = mapped_column(ForeignKey("bid_applications.id"), index=True)
    check_type_id: Mapped[UUID] = mapped_column(ForeignKey("check_types.id"), index=True)
    result: Mapped[str] = mapped_column(String(20))
    severity: Mapped[str | None] = mapped_column(String(10))
    source: Mapped[str] = mapped_column(String(20))
    evidence: Mapped[dict[str, JsonValue] | None] = mapped_column(json_type)
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (
        CheckConstraint("result IN ('pass','fail','pending','not_evaluated')"),
        CheckConstraint("source != 'AI_ANOMALY' OR evidence IS NOT NULL"),
    )


class ComplianceScore(Entity):
    __tablename__ = "compliance_scores"
    application_id: Mapped[UUID] = mapped_column(ForeignKey("bid_applications.id"), unique=True)
    overall_score: Mapped[int | None]
    risk_level: Mapped[str] = mapped_column(String(20))
    score_breakdown: Mapped[dict[str, JsonValue]] = mapped_column(json_type)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (CheckConstraint("overall_score BETWEEN 0 AND 100"),)


class Recommendation(Entity):
    __tablename__ = "ai_recommendations"
    application_id: Mapped[UUID] = mapped_column(ForeignKey("bid_applications.id"), index=True)
    recommendation_text: Mapped[str] = mapped_column(Text)
    suggested_action: Mapped[str] = mapped_column(String(30))
    model_used: Mapped[str] = mapped_column(String(100))
    prompt_tokens: Mapped[int]
    completion_tokens: Mapped[int]
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Decision(Entity):
    __tablename__ = "decisions"
    application_id: Mapped[UUID] = mapped_column(ForeignKey("bid_applications.id"), index=True)
    officer_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    decision_value: Mapped[str] = mapped_column(String(30))
    remarks: Mapped[str] = mapped_column(Text)
    overrode_ai_recommendation: Mapped[bool]
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (
        CheckConstraint("decision_value IN ('qualify','disqualify','request_more_info')"),
        CheckConstraint("NOT overrode_ai_recommendation OR length(trim(remarks)) >= 10"),
    )


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    application_id: Mapped[UUID] = mapped_column(ForeignKey("bid_applications.id"), index=True)
    actor: Mapped[str] = mapped_column(String(100))
    action: Mapped[str] = mapped_column(String(100))
    before_state: Mapped[dict[str, JsonValue] | None] = mapped_column(json_type)
    after_state: Mapped[dict[str, JsonValue] | None] = mapped_column(json_type)
    prev_event_hash: Mapped[str | None] = mapped_column(String(64))
    event_hash: Mapped[str] = mapped_column(String(64), unique=True)
    event_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (
        Index("ix_audit_case_time", "application_id", "event_at"),
        Index("uq_audit_successor", "application_id", "prev_event_hash", unique=True),
    )
