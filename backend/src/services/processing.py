"""Mock processing pipeline for demo: extraction, verification, scoring."""

import random
from decimal import Decimal
from uuid import UUID, uuid4

from pydantic import JsonValue
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.controllers.dependencies import Principal
from src.domain.contracts import CheckResult, EvaluatedCheck, Severity
from src.domain.evaluation import compute_score, evaluate_rule
from src.models.entities import (
    ComplianceCheck,
    ComplianceScore,
    Document,
    EligibilityRule,
    Recommendation,
    RuleSet,
    now,
)

# Mock extracted fields per document type
MOCK_EXTRACTIONS: dict[str, dict[str, JsonValue]] = {
    "pan_card": {
        "pan_number": "ABCDE1234F",
        "name": "Test Bidder Enterprises",
        "status": "Active",
    },
    "gst_certificate": {
        "gstin": "29ABCDE1234F1Z5",
        "trade_name": "Test Bidder Enterprises",
        "gst_status": "Active",
        "registration_date": "2020-01-15",
    },
    "udyam_certificate": {
        "udyam_number": "UDYAM-KA-01-0012345",
        "enterprise_name": "Test Bidder Enterprises",
        "category": "Small",
        "date_of_registration": "2021-06-20",
    },
    "mca_extract": {
        "cin": "U12345KA2019PTC012345",
        "company_name": "Test Bidder Enterprises Pvt Ltd",
        "company_status": "Active",
        "date_of_incorporation": "2019-03-10",
    },
    "general": {
        "document_type": "general",
        "readable": True,
    },
}


async def run_mock_pipeline(
    session: AsyncSession,
    application_id: UUID,
    rule_set_id: UUID,
    actor: Principal,
) -> None:
    """Run a synthetic processing pipeline for demo purposes."""

    # Step 1: Mock extraction on all documents
    documents = (
        await session.scalars(
            select(Document).where(Document.application_id == application_id)
        )
    ).all()

    for doc in documents:
        # Simulate OCR extraction
        mock_fields = MOCK_EXTRACTIONS.get(doc.doc_type, MOCK_EXTRACTIONS["general"])
        doc.extracted_fields = mock_fields
        doc.extraction_status = "completed"
        doc.extraction_confidence = Decimal(str(round(random.uniform(0.85, 0.99), 3)))

    # Step 2: Run rule-based compliance checks
    rule_set = await session.get(RuleSet, rule_set_id)
    if rule_set is None:
        return

    rules = (
        await session.scalars(
            select(EligibilityRule).where(EligibilityRule.rule_set_id == rule_set_id)
        )
    ).all()

    # Gather all extracted fields across documents
    all_fields: dict[str, JsonValue] = {}
    for doc in documents:
        if doc.extracted_fields:
            all_fields.update(doc.extracted_fields)

    evaluated_checks: list[EvaluatedCheck] = []
    anomalies: list[Severity] = []

    for rule in rules:
        from src.domain.contracts import RuleCondition

        condition = RuleCondition.model_validate(rule.condition)
        result = evaluate_rule(
            condition, all_fields, adapter_configured=True, source_available=True
        )

        check = ComplianceCheck(
            id=uuid4(),
            application_id=application_id,
            check_type_id=rule.check_type_id,
            result=result,
            severity=rule.severity_if_fail if result == CheckResult.FAIL else None,
            source="RULE_ENGINE",
            evidence={
                "rule_condition": rule.condition,
                "extracted_value": all_fields.get(condition.field),
                "adapter": "synthetic",
            },
            checked_at=now(),
        )
        session.add(check)

        evaluated_checks.append(
            EvaluatedCheck(
                check_type_id=rule.check_type_id,
                result=result,
                mandatory=rule.is_mandatory,
            )
        )

        if result == CheckResult.FAIL:
            anomalies.append(Severity(rule.severity_if_fail))

    await session.flush()

    # Step 3: Compute score
    from src.domain.contracts import ScoringPolicy

    scoring_policy = None
    if rule_set.scoring_policy:
        try:
            scoring_policy = ScoringPolicy.model_validate(rule_set.scoring_policy)
        except Exception:
            pass

    score_result = compute_score(evaluated_checks, anomalies, scoring_policy)

    # Save compliance score
    existing_score = await session.scalar(
        select(ComplianceScore).where(ComplianceScore.application_id == application_id)
    )
    if existing_score:
        existing_score.overall_score = score_result.overall_score
        existing_score.risk_level = score_result.risk_level
        existing_score.score_breakdown = score_result.score_breakdown
        existing_score.computed_at = now()
    else:
        compliance_score = ComplianceScore(
            id=uuid4(),
            application_id=application_id,
            overall_score=score_result.overall_score,
            risk_level=score_result.risk_level,
            score_breakdown=score_result.score_breakdown,
            computed_at=now(),
        )
        session.add(compliance_score)

    # Step 4: Generate mock AI recommendation
    if score_result.risk_level == "LOW":
        rec_text = (
            "Based on the compliance analysis, all mandatory checks have passed. "
            "The bidder's documentation appears complete and consistent. "
            "PAN, GST, and Udyam registrations are active and names match across documents. "
            "No debarment or blacklisting records found."
        )
        suggested = "qualify"
    elif score_result.risk_level == "HIGH":
        rec_text = (
            "Several compliance checks have failed or returned inconsistent results. "
            "The officer should carefully review the flagged items before making a decision. "
            "Key concerns include potential document inconsistencies and failed mandatory checks."
        )
        suggested = "disqualify"
    else:
        rec_text = (
            "Some compliance checks are pending or have minor issues. "
            "The bidder may benefit from providing additional documentation or clarification. "
            "Overall risk is moderate — manual review recommended."
        )
        suggested = "request_more_info"

    recommendation = Recommendation(
        id=uuid4(),
        application_id=application_id,
        recommendation_text=rec_text,
        suggested_action=suggested,
        model_used="synthetic-demo-v1",
        prompt_tokens=0,
        completion_tokens=0,
        generated_at=now(),
    )
    session.add(recommendation)
    await session.flush()
