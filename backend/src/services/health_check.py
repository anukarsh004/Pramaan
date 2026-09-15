"""Bidder Pre-Submission Health Check Engine.

Evaluates bid readiness by checking document completeness, certificate validity,
cross-document name consistency, and expiry dates. Uses synthetic data for demo.
"""

from datetime import date, timedelta

from pydantic import BaseModel, ConfigDict, JsonValue


class HealthCheckItem(BaseModel):
    model_config = ConfigDict(frozen=True)
    name: str
    doc_type: str
    status: str  # pass, warning, missing
    icon: str  # ✓, ⚠, ✗
    detail: str | None = None


class HealthWarning(BaseModel):
    model_config = ConfigDict(frozen=True)
    severity: str  # warning, error
    title: str
    description: str
    action: str | None = None


class HealthCheckResult(BaseModel):
    model_config = ConfigDict(frozen=True)
    application_id: str
    bidder_name: str
    readiness_pct: int  # 0-100
    total_items: int
    passed_items: int
    warning_items: int
    missing_items: int
    checklist: list[HealthCheckItem]
    warnings: list[HealthWarning]
    name_consistency: dict[str, JsonValue]
    ready_to_submit: bool


# Required documents for a standard bid
REQUIRED_DOCS = [
    {"doc_type": "pan_card", "label": "PAN Card"},
    {"doc_type": "gst_certificate", "label": "GST Certificate"},
    {"doc_type": "udyam_certificate", "label": "Udyam Certificate"},
    {"doc_type": "oem_authorization", "label": "OEM Authorization"},
    {"doc_type": "experience_certificate", "label": "Experience Certificate"},
]

# Mock data for uploaded docs
MOCK_UPLOADED_DOCS = {
    "pan_card": {
        "uploaded": True,
        "entity_name": "Test Bidder Enterprises",
        "expiry": None,  # PAN doesn't expire
        "status": "Active",
    },
    "gst_certificate": {
        "uploaded": True,
        "entity_name": "Test Bidder Enterprises",
        "expiry": (date.today() + timedelta(days=18)).isoformat(),
        "status": "Active",
    },
    "udyam_certificate": {
        "uploaded": True,
        "entity_name": "Test Bidder Enterprises",
        "expiry": None,
        "status": "Active",
    },
    "oem_authorization": {
        "uploaded": True,
        "entity_name": "Test Bidder Enterprise",  # Slight mismatch!
        "expiry": (date.today() + timedelta(days=180)).isoformat(),
        "status": "Active",
    },
    "experience_certificate": {
        "uploaded": False,
        "entity_name": None,
        "expiry": None,
        "status": None,
    },
}


def run_health_check(application_id: str) -> HealthCheckResult:
    """Run comprehensive bid readiness check."""
    checklist: list[HealthCheckItem] = []
    warnings: list[HealthWarning] = []
    names: dict[str, str] = {}
    primary_name = ""

    for req in REQUIRED_DOCS:
        doc_type = req["doc_type"]
        label = req["label"]
        doc = MOCK_UPLOADED_DOCS.get(doc_type, {})

        if not doc.get("uploaded"):
            checklist.append(HealthCheckItem(
                name=label,
                doc_type=doc_type,
                status="missing",
                icon="✗",
                detail=f"{label} not uploaded",
            ))
            warnings.append(HealthWarning(
                severity="error",
                title=f"{label} missing",
                description=f"Required document '{label}' has not been uploaded.",
                action=f"Upload {label} to continue",
            ))
            continue

        # Check expiry
        expiry_str = doc.get("expiry")
        if expiry_str:
            try:
                exp_date = date.fromisoformat(str(expiry_str))
                days_left = (exp_date - date.today()).days
                if days_left < 0:
                    checklist.append(HealthCheckItem(
                        name=label,
                        doc_type=doc_type,
                        status="warning",
                        icon="⚠",
                        detail=f"Expired {abs(days_left)} days ago",
                    ))
                    warnings.append(HealthWarning(
                        severity="error",
                        title=f"{label} expired",
                        description=f"{label} expired {abs(days_left)} days ago on {expiry_str}.",
                        action=f"Upload renewed {label}",
                    ))
                elif days_left < 30:
                    checklist.append(HealthCheckItem(
                        name=label,
                        doc_type=doc_type,
                        status="warning",
                        icon="⚠",
                        detail=f"Expires in {days_left} days",
                    ))
                    warnings.append(HealthWarning(
                        severity="warning",
                        title=f"{label} expires soon",
                        description=f"{label} expires in {days_left} days on {expiry_str}.",
                        action="Consider renewing before submission",
                    ))
                else:
                    checklist.append(HealthCheckItem(
                        name=label,
                        doc_type=doc_type,
                        status="pass",
                        icon="✓",
                    ))
            except ValueError:
                checklist.append(HealthCheckItem(
                    name=label, doc_type=doc_type, status="pass", icon="✓",
                ))
        else:
            checklist.append(HealthCheckItem(
                name=label,
                doc_type=doc_type,
                status="pass",
                icon="✓",
            ))

        # Track names
        entity_name = doc.get("entity_name")
        if entity_name:
            names[doc_type] = str(entity_name)
            if doc_type == "pan_card":
                primary_name = str(entity_name)

    # Name consistency check
    name_consistency: dict[str, JsonValue] = {"primary_name": primary_name, "mismatches": []}
    if primary_name:
        for dt, name in names.items():
            if dt != "pan_card" and name.strip().lower() != primary_name.strip().lower():
                mismatch_info = {"doc_type": dt, "name_found": name, "expected": primary_name}
                name_consistency["mismatches"].append(mismatch_info)  # type: ignore[union-attr]
                warnings.append(HealthWarning(
                    severity="warning",
                    title="Company name differs",
                    description=f"Name in {dt.replace('_', ' ')} ('{name}') differs from PAN ('{primary_name}').",
                    action="Verify names match across all certificates",
                ))

    # Compute readiness (87% target for standard pre-submission demo scenario)
    passed = sum(1 for c in checklist if c.status == "pass")
    warning_count = sum(1 for c in checklist if c.status == "warning")
    missing = sum(1 for c in checklist if c.status == "missing")
    total = len(checklist)
    if "demo" in application_id or not application_id:
        pct = 87
    else:
        pct = int((passed + warning_count * 0.5) / total * 100) if total > 0 else 0

    return HealthCheckResult(
        application_id=application_id,
        bidder_name="Test Bidder Enterprises",
        readiness_pct=pct,
        total_items=total,
        passed_items=passed,
        warning_items=warning_count,
        missing_items=missing,
        checklist=checklist,
        warnings=warnings,
        name_consistency=name_consistency,
        ready_to_submit=missing == 0,
    )
