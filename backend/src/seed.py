"""Seed demo data for development — called once when tables are empty."""

import logging
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.controllers.dependencies import (
    DEV_ADMIN_ID,
    DEV_BIDDER_ID,
    DEV_OFFICER_ID,
    DEV_VIGILANCE_ID,
)
from src.models.entities import (
    Assignment,
    BidApplication,
    Bidder,
    CheckType,
    ComplianceCheck,
    ComplianceScore,
    Decision,
    Document,
    EligibilityRule,
    Recommendation,
    RuleSet,
    Tender,
    User,
    now,
)

logger = logging.getLogger(__name__)

# ── Well-known IDs ──
BIDDER_1_ID = UUID("10000000-0000-4000-a000-000000000001")
BIDDER_2_ID = UUID("10000000-0000-4000-a000-000000000002")
BIDDER_3_ID = UUID("10000000-0000-4000-a000-000000000003")
BIDDER_USER_ID = UUID("10000000-0000-4000-a000-000000000010")

TENDER_1_ID = UUID("20000000-0000-4000-a000-000000000001")
TENDER_2_ID = UUID("20000000-0000-4000-a000-000000000002")
TENDER_3_ID = UUID("20000000-0000-4000-a000-000000000003")

RULESET_1_ID = UUID("30000000-0000-4000-a000-000000000001")

CT_PAN_ID = UUID("40000000-0000-4000-a000-000000000001")
CT_GST_ID = UUID("40000000-0000-4000-a000-000000000002")
CT_UDYAM_ID = UUID("40000000-0000-4000-a000-000000000003")
CT_MCA_ID = UUID("40000000-0000-4000-a000-000000000004")
CT_DEBAR_ID = UUID("40000000-0000-4000-a000-000000000005")

APP_1_ID = UUID("50000000-0000-4000-a000-000000000001")
APP_2_ID = UUID("50000000-0000-4000-a000-000000000002")
APP_3_ID = UUID("50000000-0000-4000-a000-000000000003")
APP_4_ID = UUID("50000000-0000-4000-a000-000000000004")
APP_5_ID = UUID("50000000-0000-4000-a000-000000000005")
APP_6_ID = UUID("50000000-0000-4000-a000-000000000006")
APP_7_ID = UUID("50000000-0000-4000-a000-000000000007")


async def seed_if_empty(session: AsyncSession) -> None:
    """Populate demo data only when no users exist yet."""
    existing = await session.scalar(select(User.id).limit(1))
    if existing is not None:
        logger.info("Database already seeded — skipping")
        return

    logger.info("Seeding development database with demo data…")

    # Create a default password hash for seeded users
    from src.services.auth_service import get_password_hash
    default_password_hash = get_password_hash("Password123!")

    # ── Users ──
    users = [
        User(
            id=DEV_OFFICER_ID,
            password_hash=default_password_hash,
            email="officer@pramaan.dev",
            full_name="Dev Officer",
            role="OFFICER",
            is_active=True,
            is_verified=True,
        ),
        User(
            id=DEV_ADMIN_ID,
            password_hash=default_password_hash,
            email="admin@pramaan.dev",
            full_name="Dev Admin",
            role="ADMIN",
            is_active=True,
            is_verified=True,
        ),
        User(
            id=DEV_BIDDER_ID,
            password_hash=default_password_hash,
            email="bidder@pramaan.dev",
            full_name="Dev Bidder",
            role="BIDDER",
            is_active=True,
            is_verified=True,
        ),
        User(
            id=DEV_VIGILANCE_ID,
            password_hash=default_password_hash,
            email="vigilance@pramaan.dev",
            full_name="Dev Vigilance",
            role="VIGILANCE",
            is_active=True,
            is_verified=True,
        ),
        User(
            id=BIDDER_USER_ID,
            password_hash=default_password_hash,
            email="techcorp@example.com",
            full_name="TechCorp User",
            role="BIDDER",
            is_active=True,
            is_verified=True,
        ),
    ]
    for u in users:
        session.add(u)

    # ── Bidders ──
    bidders = [
        Bidder(
            id=BIDDER_1_ID,
            legal_name="Apex Technologies Pvt Ltd",
            pan_number="ABCPA1234A",
            gstin="29ABCPA1234A1Z5",
            udyam_number="UDYAM-KA-01-0012345",
            cin="U12345KA2019PTC012345",
            registered_address="123 MG Road, Bengaluru 560001",
            user_id=DEV_BIDDER_ID,
        ),
        Bidder(
            id=BIDDER_2_ID,
            legal_name="GlobalTech Systems India",
            pan_number="BGTSI5678B",
            gstin="07BGTSI5678B1Z9",
            udyam_number="UDYAM-DL-02-0054321",
            registered_address="78 Nehru Place, New Delhi 110019",
        ),
        Bidder(
            id=BIDDER_3_ID,
            legal_name="Pinnacle Enterprises",
            pan_number="CPENT9012C",
            gstin="19CPENT9012C1Z7",
            registered_address="45 Park Street, Kolkata 700016",
        ),
    ]
    for b in bidders:
        session.add(b)

    # ── Check Types ──
    check_types = [
        CheckType(id=CT_PAN_ID, name="PAN Verification", source_system="RULE_ENGINE", mandatory=True),
        CheckType(id=CT_GST_ID, name="GST Status Check", source_system="RULE_ENGINE", mandatory=True),
        CheckType(id=CT_UDYAM_ID, name="Udyam Registration", source_system="RULE_ENGINE", mandatory=False),
        CheckType(id=CT_MCA_ID, name="MCA Company Status", source_system="RULE_ENGINE", mandatory=False),
        CheckType(id=CT_DEBAR_ID, name="Debarment Check", source_system="RULE_ENGINE", mandatory=True),
    ]
    for ct in check_types:
        session.add(ct)

    # ── Rule Set ──
    rule_set = RuleSet(
        id=RULESET_1_ID,
        tender_category="IT Equipment",
        version=1,
        is_active=True,
        created_by=DEV_ADMIN_ID,
        scoring_policy={
            "weights": {
                str(CT_PAN_ID): 25,
                str(CT_GST_ID): 25,
                str(CT_UDYAM_ID): 15,
                str(CT_MCA_ID): 15,
                str(CT_DEBAR_ID): 20,
            },
            "penalties": {"low": 5, "medium": 15, "high": 30},
            "low_risk_min": 70,
            "medium_risk_min": 40,
        },
    )
    session.add(rule_set)

    # ── Eligibility Rules ──
    rules_data = [
        (CT_PAN_ID, {"field": "status", "op": "EQ", "value": "Active"}, True, "high"),
        (CT_GST_ID, {"field": "gst_status", "op": "EQ", "value": "Active"}, True, "high"),
        (CT_UDYAM_ID, {"field": "category", "op": "IN", "value": ["Micro", "Small", "Medium"]}, False, "medium"),
        (CT_MCA_ID, {"field": "company_status", "op": "EQ", "value": "Active"}, False, "medium"),
        (CT_DEBAR_ID, {"field": "debarment_status", "op": "EQ", "value": "clear"}, True, "high"),
    ]
    for ct_id, condition, mandatory, severity in rules_data:
        session.add(
            EligibilityRule(
                id=uuid4(),
                rule_set_id=RULESET_1_ID,
                check_type_id=ct_id,
                condition=condition,
                is_mandatory=mandatory,
                severity_if_fail=severity,
            )
        )

    # ── Tenders ──
    today = date.today()
    tenders = [
        Tender(
            id=TENDER_1_ID,
            gem_bid_number="GEM/2025/B/4567890",
            title="IT Equipment Supply — Phase 1 (Desktop Computers & Peripherals)",
            category="IT Equipment",
            estimated_value=Decimal("4850000.00"),
            eligibility_rule_set_id=RULESET_1_ID,
            closing_date=today + timedelta(days=30),
            created_by=DEV_ADMIN_ID,
        ),
        Tender(
            id=TENDER_2_ID,
            gem_bid_number="GEM/2025/B/4567891",
            title="Network Infrastructure Upgrade — Core Switches & Firewalls",
            category="IT Equipment",
            estimated_value=Decimal("7800000.00"),
            eligibility_rule_set_id=RULESET_1_ID,
            closing_date=today + timedelta(days=45),
            created_by=DEV_ADMIN_ID,
        ),
        Tender(
            id=TENDER_3_ID,
            gem_bid_number="GEM/2025/B/4567892",
            title="Server Procurement 2025 — Rack & Blade Servers",
            category="IT Equipment",
            estimated_value=Decimal("12500000.00"),
            eligibility_rule_set_id=RULESET_1_ID,
            closing_date=today + timedelta(days=60),
            created_by=DEV_ADMIN_ID,
        ),
    ]
    for t in tenders:
        session.add(t)

    # ── Assignments (Officer → Tenders) ──
    for tid in [TENDER_1_ID, TENDER_2_ID, TENDER_3_ID]:
        session.add(Assignment(tender_id=tid, officer_id=DEV_OFFICER_ID))

    # ── Bid Applications ──
    ts = now()
    applications = [
        # Ready for review — high score
        BidApplication(
            id=APP_1_ID,
            bidder_id=BIDDER_1_ID,
            tender_id=TENDER_1_ID,
            status="ready_for_review",
            submitted_at=ts - timedelta(days=5),
            rule_set_id=RULESET_1_ID,
        ),
        # Ready for review — medium risk
        BidApplication(
            id=APP_2_ID,
            bidder_id=BIDDER_2_ID,
            tender_id=TENDER_1_ID,
            status="ready_for_review",
            submitted_at=ts - timedelta(days=3),
            rule_set_id=RULESET_1_ID,
        ),
        # Intake complete — awaiting processing
        BidApplication(
            id=APP_3_ID,
            bidder_id=BIDDER_3_ID,
            tender_id=TENDER_2_ID,
            status="intake_complete",
            submitted_at=ts - timedelta(days=1),
            rule_set_id=RULESET_1_ID,
        ),
        # Intake pending
        BidApplication(
            id=APP_4_ID,
            bidder_id=BIDDER_1_ID,
            tender_id=TENDER_3_ID,
            status="intake_pending",
            rule_set_id=RULESET_1_ID,
        ),
        # Closed — decided
        BidApplication(
            id=APP_5_ID,
            bidder_id=BIDDER_2_ID,
            tender_id=TENDER_2_ID,
            status="closed",
            submitted_at=ts - timedelta(days=10),
            closed_at=ts - timedelta(days=7),
            rule_set_id=RULESET_1_ID,
        ),
        # Golden Case 1: Doc Tamper / Inconsistency
        BidApplication(
            id=APP_6_ID,
            bidder_id=BIDDER_1_ID,
            tender_id=TENDER_2_ID,
            status="ready_for_review",
            submitted_at=ts - timedelta(days=2),
            rule_set_id=RULESET_1_ID,
        ),
        # Golden Case 2: Unavailable Source & Human Override
        BidApplication(
            id=APP_7_ID,
            bidder_id=BIDDER_3_ID,
            tender_id=TENDER_3_ID,
            status="closed",
            submitted_at=ts - timedelta(days=15),
            closed_at=ts - timedelta(days=2),
            rule_set_id=RULESET_1_ID,
        ),
    ]
    for a in applications:
        session.add(a)

    # ── Documents for APP_1 ──
    doc_types_1 = ["pan_card", "gst_certificate", "udyam_certificate", "mca_extract"]
    for i, dt in enumerate(doc_types_1):
        session.add(
            Document(
                id=uuid4(),
                application_id=APP_1_ID,
                doc_type=dt,
                version=1,
                storage_uri=f"local://{APP_1_ID}/{dt}_v1.pdf",
                extraction_status="completed",
                extracted_fields={
                    "pan_card": {"pan_number": "ABCPA1234A", "name": "Apex Technologies Pvt Ltd", "status": "Active"},
                    "gst_certificate": {"gstin": "29ABCPA1234A1Z5", "trade_name": "Apex Technologies Pvt Ltd", "gst_status": "Active", "registration_date": "2020-01-15"},
                    "udyam_certificate": {"udyam_number": "UDYAM-KA-01-0012345", "enterprise_name": "Apex Technologies Pvt Ltd", "category": "Small", "date_of_registration": "2021-06-20"},
                    "mca_extract": {"cin": "U12345KA2019PTC012345", "company_name": "Apex Technologies Pvt Ltd", "company_status": "Active", "date_of_incorporation": "2019-03-10"},
                }.get(dt, {}),
                extraction_confidence=Decimal("0.95"),
                uploaded_at=ts - timedelta(days=6),
                uploaded_by=DEV_OFFICER_ID,
            )
        )

    # ── Documents for APP_2 ──
    for dt in ["pan_card", "gst_certificate"]:
        session.add(
            Document(
                id=uuid4(),
                application_id=APP_2_ID,
                doc_type=dt,
                version=1,
                storage_uri=f"local://{APP_2_ID}/{dt}_v1.pdf",
                extraction_status="completed",
                extracted_fields={
                    "pan_card": {"pan_number": "BGTSI5678B", "name": "GlobalTech Systems India", "status": "Active"},
                    "gst_certificate": {"gstin": "07BGTSI5678B1Z9", "trade_name": "GlobalTech Systems", "gst_status": "Active"},
                }.get(dt, {}),
                extraction_confidence=Decimal("0.91"),
                uploaded_at=ts - timedelta(days=4),
                uploaded_by=DEV_OFFICER_ID,
            )
        )

    # ── Compliance Checks & Scores for APP_1 (LOW risk) ──
    checks_1 = [
        (CT_PAN_ID, "pass", None, "RULE_ENGINE"),
        (CT_GST_ID, "pass", None, "RULE_ENGINE"),
        (CT_UDYAM_ID, "pass", None, "RULE_ENGINE"),
        (CT_MCA_ID, "pass", None, "RULE_ENGINE"),
        (CT_DEBAR_ID, "pass", None, "RULE_ENGINE"),
    ]
    for ct_id, result, severity, source in checks_1:
        session.add(
            ComplianceCheck(
                id=uuid4(),
                application_id=APP_1_ID,
                check_type_id=ct_id,
                result=result,
                severity=severity,
                source=source,
                evidence={"adapter": "synthetic", "rule_condition": {"field": "status", "op": "EQ", "value": "Active"}},
                checked_at=ts - timedelta(days=5),
            )
        )

    session.add(
        ComplianceScore(
            id=uuid4(),
            application_id=APP_1_ID,
            overall_score=92,
            risk_level="LOW",
            score_breakdown={
                "contributions": {str(CT_PAN_ID): 25.0, str(CT_GST_ID): 25.0, str(CT_UDYAM_ID): 15.0, str(CT_MCA_ID): 15.0, str(CT_DEBAR_ID): 20.0},
                "anomaly_penalty": 8.0,
            },
            computed_at=ts - timedelta(days=5),
        )
    )

    session.add(
        Recommendation(
            id=uuid4(),
            application_id=APP_1_ID,
            recommendation_text="Based on the compliance analysis, all mandatory checks have passed. The bidder's documentation appears complete and consistent. PAN, GST, and Udyam registrations are active and names match across documents. No debarment or blacklisting records found.",
            suggested_action="qualify",
            model_used="synthetic-demo-v1",
            prompt_tokens=0,
            completion_tokens=0,
            generated_at=ts - timedelta(days=5),
        )
    )

    # ── Compliance Checks & Scores for APP_2 (MEDIUM risk) ──
    checks_2 = [
        (CT_PAN_ID, "pass", None, "RULE_ENGINE"),
        (CT_GST_ID, "pass", None, "RULE_ENGINE"),
        (CT_UDYAM_ID, "pending", None, "RULE_ENGINE"),
        (CT_MCA_ID, "pending", None, "RULE_ENGINE"),
        (CT_DEBAR_ID, "pass", None, "RULE_ENGINE"),
    ]
    for ct_id, result, severity, source in checks_2:
        session.add(
            ComplianceCheck(
                id=uuid4(),
                application_id=APP_2_ID,
                check_type_id=ct_id,
                result=result,
                severity=severity,
                source=source,
                evidence={"adapter": "synthetic"},
                checked_at=ts - timedelta(days=3),
            )
        )

    session.add(
        ComplianceScore(
            id=uuid4(),
            application_id=APP_2_ID,
            overall_score=58,
            risk_level="MEDIUM",
            score_breakdown={
                "contributions": {str(CT_PAN_ID): 25.0, str(CT_GST_ID): 25.0, str(CT_UDYAM_ID): 0.0, str(CT_MCA_ID): 0.0, str(CT_DEBAR_ID): 20.0},
                "anomaly_penalty": 12.0,
            },
            computed_at=ts - timedelta(days=3),
        )
    )

    session.add(
        Recommendation(
            id=uuid4(),
            application_id=APP_2_ID,
            recommendation_text="Some compliance checks are pending or have minor issues. The bidder may benefit from providing additional documentation or clarification. Overall risk is moderate — manual review recommended.",
            suggested_action="request_more_info",
            model_used="synthetic-demo-v1",
            prompt_tokens=0,
            completion_tokens=0,
            generated_at=ts - timedelta(days=3),
        )
    )

    # ── Score for APP_5 (closed HIGH risk) ──
    session.add(
        ComplianceScore(
            id=uuid4(),
            application_id=APP_5_ID,
            overall_score=28,
            risk_level="HIGH",
            score_breakdown={
                "contributions": {str(CT_PAN_ID): 25.0, str(CT_GST_ID): 0.0, str(CT_UDYAM_ID): 0.0, str(CT_MCA_ID): 0.0, str(CT_DEBAR_ID): 0.0},
                "anomaly_penalty": 30.0,
            },
            computed_at=ts - timedelta(days=8),
        )
    )

    # ── Documents & Checks for APP_6 (Doc Tamper Inconsistency) ──
    # Name mismatch planted between PAN and GST
    session.add(
        Document(
            id=uuid4(),
            application_id=APP_6_ID,
            doc_type="pan_card",
            version=1,
            storage_uri=f"local://{APP_6_ID}/pan_card_v1.pdf",
            extraction_status="completed",
            extracted_fields={"pan_number": "ABCPA1234A", "name": "Apex Technologies Pvt Ltd", "status": "Active"},
            extraction_confidence=Decimal("0.98"),
            uploaded_at=ts - timedelta(days=2),
            uploaded_by=DEV_OFFICER_ID,
        )
    )
    session.add(
        Document(
            id=uuid4(),
            application_id=APP_6_ID,
            doc_type="gst_certificate",
            version=1,
            storage_uri=f"local://{APP_6_ID}/gst_certificate_v1.pdf",
            extraction_status="completed",
            extracted_fields={"gstin": "29ABCPA1234A1Z5", "trade_name": "FAKE CORP LLC", "gst_status": "Active"},
            extraction_confidence=Decimal("0.95"),
            uploaded_at=ts - timedelta(days=2),
            uploaded_by=DEV_OFFICER_ID,
        )
    )
    session.add(
        ComplianceCheck(
            id=uuid4(),
            application_id=APP_6_ID,
            check_type_id=CT_PAN_ID,
            result="pass",
            severity=None,
            source="RULE_ENGINE",
            evidence={"adapter": "synthetic"},
            checked_at=ts - timedelta(days=2),
        )
    )
    # Plant a HIGH risk score for doc tamper
    session.add(
        ComplianceScore(
            id=uuid4(),
            application_id=APP_6_ID,
            overall_score=40,
            risk_level="HIGH",
            score_breakdown={
                "contributions": {str(CT_PAN_ID): 25.0, str(CT_GST_ID): 0.0},
                "anomaly_penalty": 40.0, # Large penalty for name mismatch
                "tampering_flags": ["Name mismatch between PAN (Apex Technologies Pvt Ltd) and GST (FAKE CORP LLC)"]
            },
            computed_at=ts - timedelta(days=2),
        )
    )
    session.add(
        Recommendation(
            id=uuid4(),
            application_id=APP_6_ID,
            recommendation_text="CRITICAL: Serious inconsistency detected. The PAN card name (Apex Technologies Pvt Ltd) does not match the GST trade name (FAKE CORP LLC). This strongly suggests document tampering or fraud.",
            suggested_action="disqualify",
            model_used="synthetic-demo-v1",
            prompt_tokens=0,
            completion_tokens=0,
            generated_at=ts - timedelta(days=2),
        )
    )

    # ── Documents & Checks for APP_7 (Unavailable Source & Human Override) ──
    # Check is not_evaluated
    session.add(
        ComplianceCheck(
            id=uuid4(),
            application_id=APP_7_ID,
            check_type_id=CT_MCA_ID,
            result="not_evaluated",
            severity="high",
            source="RULE_ENGINE",
            evidence={"error": "Source API timeout (504 Gateway Timeout)", "adapter": "synthetic"},
            checked_at=ts - timedelta(days=15),
        )
    )
    session.add(
        ComplianceScore(
            id=uuid4(),
            application_id=APP_7_ID,
            overall_score=85,
            risk_level="MEDIUM",
            score_breakdown={
                "contributions": {str(CT_PAN_ID): 25.0, str(CT_GST_ID): 25.0, str(CT_UDYAM_ID): 15.0, str(CT_MCA_ID): 0.0, str(CT_DEBAR_ID): 20.0},
                "anomaly_penalty": 0.0,
            },
            computed_at=ts - timedelta(days=15),
        )
    )
    session.add(
        Recommendation(
            id=uuid4(),
            application_id=APP_7_ID,
            recommendation_text="MCA validation could not be completed due to source system unavailability. Other mandatory checks passed. Manual verification of MCA status is required before proceeding.",
            suggested_action="request_more_info",
            model_used="synthetic-demo-v1",
            prompt_tokens=0,
            completion_tokens=0,
            generated_at=ts - timedelta(days=15),
        )
    )
    # Plant the Human Override
    session.add(
        Decision(
            id=uuid4(),
            application_id=APP_7_ID,
            officer_id=DEV_OFFICER_ID,
            decision_value="qualify",
            remarks="Verified MCA active status offline via physical certificate provided by bidder. Overriding AI recommendation to wait.",
            overrode_ai_recommendation=True,
            decided_at=ts - timedelta(days=2),
        )
    )

    await session.flush()
    logger.info("Database seeded with %d users, %d bidders, %d tenders, %d applications",
                len(users), len(bidders), len(tenders), len(applications))
