"""Document Tamper & Authenticity Risk Engine.

Analyzes documents for suspicious characteristics: metadata anomalies,
name mismatches across certificates, date inconsistencies, and format issues.
Uses synthetic data for demo.
"""

from pydantic import BaseModel, ConfigDict, JsonValue


class TamperFlag(BaseModel):
    model_config = ConfigDict(frozen=True)
    category: str  # METADATA, NAME_MISMATCH, DATE_ANOMALY, FORMAT, DUPLICATE
    severity: str  # LOW, MEDIUM, HIGH
    description: str
    evidence: dict[str, JsonValue]


class DocumentRisk(BaseModel):
    model_config = ConfigDict(frozen=True)
    document_id: str
    doc_type: str
    tamper_score: int  # 0-100 (higher = more suspicious)
    flags: list[TamperFlag]
    authenticity_rating: str  # TRUSTED, SUSPECT, HIGH_RISK


class NameComparison(BaseModel):
    model_config = ConfigDict(frozen=True)
    doc_type: str
    field_name: str
    value: str
    matches_primary: bool


class DocTamperReport(BaseModel):
    model_config = ConfigDict(frozen=True)
    application_id: str
    documents_analyzed: int
    overall_risk: str
    overall_score: int
    document_risks: list[DocumentRisk]
    name_comparisons: list[NameComparison]
    summary: str


# ── Synthetic demo analysis ──

MOCK_DOC_ANALYSIS: dict[str, dict[str, JsonValue]] = {
    "pan_card": {
        "entity_name": "Test Bidder Enterprises",
        "issue_date": "2018-03-15",
        "file_size_kb": 245,
        "resolution_dpi": 300,
        "metadata_creation": "2024-01-10T14:30:00",
        "metadata_modified": "2024-01-10T14:30:00",
    },
    "gst_certificate": {
        "entity_name": "Test Bidder Enterprises",
        "trade_name": "Test Bidder Enterprises",
        "issue_date": "2020-01-15",
        "expiry_date": "2025-10-02",
        "file_size_kb": 380,
        "resolution_dpi": 300,
        "metadata_creation": "2024-06-15T09:00:00",
        "metadata_modified": "2024-06-15T09:00:00",
    },
    "udyam_certificate": {
        "entity_name": "Test Bidder Enterprises",
        "issue_date": "2021-06-20",
        "file_size_kb": 190,
        "resolution_dpi": 150,
        "metadata_creation": "2023-11-01T16:45:00",
        "metadata_modified": "2024-08-20T11:22:00",
    },
    "oem_authorization": {
        "entity_name": "Test Bidder Enterprise",  # Slight name mismatch!
        "issue_date": "2024-04-01",
        "expiry_date": "2025-03-31",
        "file_size_kb": 52,
        "resolution_dpi": 72,
        "metadata_creation": "2024-09-01T08:00:00",
        "metadata_modified": "2024-09-10T22:15:00",
    },
    "experience_certificate": {
        "entity_name": "Test Bidder Enterprises Pvt Ltd",  # Name differs
        "issue_date": "2023-12-01",
        "file_size_kb": 15,
        "resolution_dpi": 96,
        "metadata_creation": "2024-09-12T03:00:00",
        "metadata_modified": "2024-09-12T03:05:00",
    },
}


def analyze_document_tamper(application_id: str) -> DocTamperReport:
    """Analyze documents for tampering signals."""
    document_risks: list[DocumentRisk] = []
    name_comparisons: list[NameComparison] = []
    primary_name = MOCK_DOC_ANALYSIS["pan_card"]["entity_name"]

    for doc_type, fields in MOCK_DOC_ANALYSIS.items():
        flags: list[TamperFlag] = []

        # 1. Metadata consistency: modified != created
        created = str(fields.get("metadata_creation", ""))
        modified = str(fields.get("metadata_modified", ""))
        if created and modified and created != modified:
            flags.append(TamperFlag(
                category="METADATA",
                severity="MEDIUM",
                description=f"File was modified after creation (created: {created[:10]}, modified: {modified[:10]})",
                evidence={"created": created, "modified": modified},
            ))

        # 2. Name mismatch detection
        doc_name = str(fields.get("entity_name", ""))
        matches = doc_name.strip().lower() == str(primary_name).strip().lower()
        name_comparisons.append(NameComparison(
            doc_type=doc_type,
            field_name="entity_name",
            value=doc_name,
            matches_primary=matches,
        ))
        if not matches:
            flags.append(TamperFlag(
                category="NAME_MISMATCH",
                severity="HIGH",
                description=f"Entity name '{doc_name}' differs from PAN name '{primary_name}'",
                evidence={"pan_name": str(primary_name), "document_name": doc_name, "doc_type": doc_type},
            ))

        # 3. Resolution anomalies
        dpi = fields.get("resolution_dpi", 300)
        if isinstance(dpi, (int, float)) and dpi < 100:
            flags.append(TamperFlag(
                category="FORMAT",
                severity="MEDIUM",
                description=f"Very low resolution ({dpi} DPI) — may indicate screenshot or digital manipulation",
                evidence={"resolution_dpi": dpi, "expected_min": 150},
            ))

        # 4. Unusually small file size
        size_kb = fields.get("file_size_kb", 100)
        if isinstance(size_kb, (int, float)) and size_kb < 30:
            flags.append(TamperFlag(
                category="FORMAT",
                severity="HIGH",
                description=f"Suspiciously small file ({size_kb} KB) for a certificate document",
                evidence={"file_size_kb": size_kb, "expected_min_kb": 50},
            ))

        # 5. Late-night modification (suspicious timing)
        if modified:
            try:
                hour = int(modified[11:13])
                if hour < 5 or hour >= 23:
                    flags.append(TamperFlag(
                        category="METADATA",
                        severity="LOW",
                        description=f"Document modified at unusual hour ({hour}:00)",
                        evidence={"modification_time": modified, "hour": hour},
                    ))
            except (ValueError, IndexError):
                pass

        # 6. Expiry check
        expiry = str(fields.get("expiry_date", ""))
        if expiry:
            from datetime import date, timedelta
            try:
                exp_date = date.fromisoformat(expiry)
                days_left = (exp_date - date.today()).days
                if days_left < 0:
                    flags.append(TamperFlag(
                        category="DATE_ANOMALY",
                        severity="HIGH",
                        description=f"Certificate expired {abs(days_left)} days ago",
                        evidence={"expiry_date": expiry, "days_expired": abs(days_left)},
                    ))
                elif days_left < 30:
                    flags.append(TamperFlag(
                        category="DATE_ANOMALY",
                        severity="MEDIUM",
                        description=f"Certificate expires in {days_left} days",
                        evidence={"expiry_date": expiry, "days_remaining": days_left},
                    ))
            except ValueError:
                pass

        # Calculate tamper score
        score = 0
        for f in flags:
            score += {"LOW": 8, "MEDIUM": 20, "HIGH": 35}.get(f.severity, 10)
        score = min(100, score)

        rating = "HIGH_RISK" if score >= 60 else "SUSPECT" if score >= 25 else "TRUSTED"

        document_risks.append(DocumentRisk(
            document_id=f"doc-{doc_type}",
            doc_type=doc_type,
            tamper_score=score,
            flags=flags,
            authenticity_rating=rating,
        ))

    overall_score = max((d.tamper_score for d in document_risks), default=0)
    overall_risk = "HIGH" if overall_score >= 60 else "MEDIUM" if overall_score >= 25 else "LOW"

    high_risk_docs = [d for d in document_risks if d.authenticity_rating == "HIGH_RISK"]
    suspect_docs = [d for d in document_risks if d.authenticity_rating == "SUSPECT"]
    name_mismatches = [n for n in name_comparisons if not n.matches_primary]

    summary_parts = []
    if high_risk_docs:
        summary_parts.append(f"{len(high_risk_docs)} high-risk document(s)")
    if suspect_docs:
        summary_parts.append(f"{len(suspect_docs)} suspect document(s)")
    if name_mismatches:
        summary_parts.append(f"{len(name_mismatches)} name mismatch(es)")

    return DocTamperReport(
        application_id=application_id,
        documents_analyzed=len(document_risks),
        overall_risk=overall_risk,
        overall_score=overall_score,
        document_risks=document_risks,
        name_comparisons=name_comparisons,
        summary=f"Analyzed {len(document_risks)} documents: {'; '.join(summary_parts) or 'no issues found'}.",
    )
