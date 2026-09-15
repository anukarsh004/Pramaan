"""Cross-Tender Intelligence — Bidder History Timeline.

Aggregates bidder participation history across all tenders: win/loss rates,
score trends, compliance patterns, and red flag accumulation.
Uses synthetic data for demo.
"""

from pydantic import BaseModel, ConfigDict, JsonValue


class TenderParticipation(BaseModel):
    model_config = ConfigDict(frozen=True)
    tender_id: str
    tender_title: str
    gem_bid_number: str
    closing_date: str
    status: str  # qualified, disqualified, pending, closed
    decision: str | None  # qualify, disqualify, request_more_info
    compliance_score: int | None
    risk_level: str
    flags: list[str]
    bid_amount: float | None


class ScoreTrend(BaseModel):
    model_config = ConfigDict(frozen=True)
    tender_title: str
    date: str
    score: int | None
    risk_level: str


class BidderStats(BaseModel):
    model_config = ConfigDict(frozen=True)
    total_participations: int
    qualified_count: int
    disqualified_count: int
    pending_count: int
    win_rate_pct: float
    avg_compliance_score: float
    total_flags: int
    most_common_flag: str | None


class CrossTenderReport(BaseModel):
    model_config = ConfigDict(frozen=True)
    bidder_id: str
    bidder_name: str
    pan_number: str
    stats: BidderStats
    participations: list[TenderParticipation]
    score_trend: list[ScoreTrend]
    red_flag_timeline: list[dict[str, JsonValue]]
    summary: str


# ── Synthetic history data ──

MOCK_BIDDER_HISTORIES: dict[str, dict[str, JsonValue]] = {
    "default": {
        "bidder_name": "Test Bidder Enterprises",
        "pan": "ABCDE1234F",
        "history": [
            {
                "tender_id": "t-hist-001",
                "tender_title": "IT Equipment Supply – FY2022",
                "gem_bid_number": "GEM/2022/B/100001",
                "closing_date": "2022-06-15",
                "status": "closed",
                "decision": "qualify",
                "compliance_score": 92,
                "risk_level": "LOW",
                "flags": [],
                "bid_amount": 4500000,
            },
            {
                "tender_id": "t-hist-002",
                "tender_title": "Server Procurement FY2022",
                "gem_bid_number": "GEM/2022/B/200045",
                "closing_date": "2022-11-20",
                "status": "closed",
                "decision": "qualify",
                "compliance_score": 88,
                "risk_level": "LOW",
                "flags": ["MINOR_DOC_DELAY"],
                "bid_amount": 7800000,
            },
            {
                "tender_id": "t-hist-003",
                "tender_title": "Network Infrastructure FY2023",
                "gem_bid_number": "GEM/2023/B/300012",
                "closing_date": "2023-03-10",
                "status": "closed",
                "decision": "request_more_info",
                "compliance_score": 65,
                "risk_level": "MEDIUM",
                "flags": ["NAME_MISMATCH", "EXPIRED_CERT"],
                "bid_amount": 12000000,
            },
            {
                "tender_id": "t-hist-004",
                "tender_title": "Desktop Computing FY2023",
                "gem_bid_number": "GEM/2023/B/400078",
                "closing_date": "2023-08-25",
                "status": "closed",
                "decision": "qualify",
                "compliance_score": 85,
                "risk_level": "LOW",
                "flags": [],
                "bid_amount": 3200000,
            },
            {
                "tender_id": "t-hist-005",
                "tender_title": "Security Systems FY2024",
                "gem_bid_number": "GEM/2024/B/500033",
                "closing_date": "2024-02-14",
                "status": "closed",
                "decision": "disqualify",
                "compliance_score": 35,
                "risk_level": "HIGH",
                "flags": ["MISSING_OEM_AUTH", "GST_EXPIRED", "ADDRESS_MISMATCH"],
                "bid_amount": 8500000,
            },
            {
                "tender_id": "t-hist-006",
                "tender_title": "Cloud Infrastructure FY2024",
                "gem_bid_number": "GEM/2024/B/600011",
                "closing_date": "2024-07-30",
                "status": "closed",
                "decision": "qualify",
                "compliance_score": 78,
                "risk_level": "MEDIUM",
                "flags": ["NEAR_EXPIRY_GST"],
                "bid_amount": 15000000,
            },
            {
                "tender_id": "t-hist-007",
                "tender_title": "IT Equipment Supply FY2025",
                "gem_bid_number": "GEM/2025/B/700055",
                "closing_date": "2025-04-10",
                "status": "ready_for_review",
                "decision": None,
                "compliance_score": 87,
                "risk_level": "LOW",
                "flags": ["NAME_MISMATCH"],
                "bid_amount": 5200000,
            },
        ],
    }
}


def get_cross_tender_report(bidder_id: str) -> CrossTenderReport:
    """Generate a cross-tender intelligence report for a bidder."""
    data = MOCK_BIDDER_HISTORIES.get(bidder_id, MOCK_BIDDER_HISTORIES["default"])
    history = data["history"]
    bidder_name = str(data["bidder_name"])
    pan = str(data["pan"])

    participations: list[TenderParticipation] = []
    score_trend: list[ScoreTrend] = []
    all_flags: list[str] = []
    flag_timeline: list[dict[str, JsonValue]] = []

    for entry in history:  # type: ignore[union-attr]
        entry_dict = dict(entry)  # type: ignore[arg-type]
        part = TenderParticipation(
            tender_id=str(entry_dict["tender_id"]),
            tender_title=str(entry_dict["tender_title"]),
            gem_bid_number=str(entry_dict["gem_bid_number"]),
            closing_date=str(entry_dict["closing_date"]),
            status=str(entry_dict["status"]),
            decision=str(entry_dict["decision"]) if entry_dict.get("decision") else None,
            compliance_score=int(entry_dict["compliance_score"]) if entry_dict.get("compliance_score") is not None else None,
            risk_level=str(entry_dict["risk_level"]),
            flags=list(entry_dict.get("flags", [])),  # type: ignore[arg-type]
            bid_amount=float(entry_dict["bid_amount"]) if entry_dict.get("bid_amount") else None,
        )
        participations.append(part)

        if part.compliance_score is not None:
            score_trend.append(ScoreTrend(
                tender_title=part.tender_title,
                date=part.closing_date,
                score=part.compliance_score,
                risk_level=part.risk_level,
            ))

        entry_flags = list(entry_dict.get("flags", []))  # type: ignore[arg-type]
        all_flags.extend(entry_flags)
        if entry_flags:
            flag_timeline.append({
                "date": str(entry_dict["closing_date"]),
                "tender": str(entry_dict["tender_title"]),
                "flags": entry_flags,
            })

    # Compute stats
    closed = [p for p in participations if p.status == "closed"]
    qualified = [p for p in closed if p.decision == "qualify"]
    disqualified = [p for p in closed if p.decision == "disqualify"]
    pending = [p for p in participations if p.status != "closed"]
    scores = [p.compliance_score for p in participations if p.compliance_score is not None]

    # Most common flag
    flag_counts: dict[str, int] = {}
    for f in all_flags:
        flag_counts[str(f)] = flag_counts.get(str(f), 0) + 1
    most_common = max(flag_counts, key=flag_counts.get) if flag_counts else None  # type: ignore[arg-type]

    stats = BidderStats(
        total_participations=len(participations),
        qualified_count=len(qualified),
        disqualified_count=len(disqualified),
        pending_count=len(pending),
        win_rate_pct=round(len(qualified) / len(closed) * 100, 1) if closed else 0,
        avg_compliance_score=round(sum(scores) / len(scores), 1) if scores else 0,
        total_flags=len(all_flags),
        most_common_flag=most_common,
    )

    # Generate summary
    summary_parts = [
        f"{stats.total_participations} tender participations",
        f"{stats.win_rate_pct}% qualification rate",
        f"average score {stats.avg_compliance_score}",
    ]
    if stats.total_flags > 0:
        summary_parts.append(f"{stats.total_flags} total flags raised")
    if stats.disqualified_count > 0:
        summary_parts.append(f"{stats.disqualified_count} disqualification(s)")

    return CrossTenderReport(
        bidder_id=bidder_id,
        bidder_name=bidder_name,
        pan_number=pan,
        stats=stats,
        participations=participations,
        score_trend=score_trend,
        red_flag_timeline=flag_timeline,
        summary=f"Bidder history: {'; '.join(summary_parts)}.",
    )
