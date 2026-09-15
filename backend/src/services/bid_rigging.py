"""Bid-Rigging Detection Engine — heuristic analysis across multiple tenders.

Identifies suspicious bidder relationships: shared addresses, PAN clusters,
rotation patterns, and coordinated pricing. Uses synthetic data for demo.
"""

from dataclasses import dataclass, field
from uuid import UUID

from pydantic import BaseModel, ConfigDict, JsonValue


class SuspectCluster(BaseModel):
    model_config = ConfigDict(frozen=False)
    cluster_id: str
    bidder_ids: list[str]
    bidder_names: list[str]
    signals: list[str]
    risk_score: int  # 0-100
    evidence: dict[str, JsonValue]


class RelationshipEdge(BaseModel):
    model_config = ConfigDict(frozen=True)
    source_bidder_id: str
    target_bidder_id: str
    source_name: str
    target_name: str
    relationship_type: str
    strength: float  # 0.0-1.0
    details: str


class BidRiggingReport(BaseModel):
    model_config = ConfigDict(frozen=True)
    total_tenders_analyzed: int
    total_bidders_analyzed: int
    suspect_clusters: list[SuspectCluster]
    relationship_edges: list[RelationshipEdge]
    overall_risk: str  # LOW, MEDIUM, HIGH
    summary: str


# ── Synthetic demo data ──

MOCK_BIDDERS = [
    {"id": "bid-001", "name": "Apex Technologies Pvt Ltd", "pan": "AAACA1234A", "address": "123 MG Road, Bengaluru 560001", "gstin": "29AAACA1234A1Z5"},
    {"id": "bid-002", "name": "Apex Digital Solutions", "pan": "AAACA1234B", "address": "123 MG Road, Bengaluru 560001", "gstin": "29AAACA1234B1Z3"},
    {"id": "bid-003", "name": "Pinnacle Enterprises", "pan": "BBCDE5678F", "address": "45 Park Street, Kolkata 700016", "gstin": "19BBCDE5678F1Z7"},
    {"id": "bid-004", "name": "Pinnacle Trading Co.", "pan": "BBCDE5678G", "address": "45 Park Street, Kolkata 700016", "gstin": "19BBCDE5678G1Z5"},
    {"id": "bid-005", "name": "GlobalTech Systems", "pan": "CCCCC9999C", "address": "78 Nehru Place, Delhi 110019", "gstin": "07CCCCC9999C1Z9"},
    {"id": "bid-006", "name": "StarLine Industries", "pan": "DDDDD7777D", "address": "22 Anna Salai, Chennai 600002", "gstin": "33DDDDD7777D1Z1"},
    {"id": "bid-007", "name": "Reliable IT Solutions", "pan": "EEEEE3333E", "address": "90 FC Road, Pune 411004", "gstin": "27EEEEE3333E1Z6"},
]

MOCK_TENDER_PARTICIPATION = [
    {"tender_id": "t-001", "title": "IT Equipment Supply – Phase 1", "bidders": ["bid-001", "bid-002", "bid-003", "bid-005"]},
    {"tender_id": "t-002", "title": "IT Equipment Supply – Phase 2", "bidders": ["bid-001", "bid-002", "bid-004", "bid-005"]},
    {"tender_id": "t-003", "title": "Network Infrastructure Upgrade", "bidders": ["bid-002", "bid-003", "bid-004", "bid-006"]},
    {"tender_id": "t-004", "title": "Server Procurement 2025", "bidders": ["bid-001", "bid-003", "bid-005", "bid-007"]},
    {"tender_id": "t-005", "title": "Desktop Computing Contract", "bidders": ["bid-001", "bid-002", "bid-004", "bid-006"]},
]

MOCK_BID_AMOUNTS = {
    "t-001": {"bid-001": 4850000, "bid-002": 4920000, "bid-003": 5100000, "bid-005": 6200000},
    "t-002": {"bid-001": 3200000, "bid-002": 3280000, "bid-004": 3500000, "bid-005": 4100000},
    "t-003": {"bid-002": 7800000, "bid-003": 7900000, "bid-004": 8100000, "bid-006": 9500000},
}


def analyze_bid_rigging(tender_id: str | None = None) -> BidRiggingReport:
    """Run heuristic bid-rigging analysis across tenders."""
    clusters: list[SuspectCluster] = []
    edges: list[RelationshipEdge] = []
    bidder_map = {b["id"]: b for b in MOCK_BIDDERS}

    tenders = MOCK_TENDER_PARTICIPATION
    if tender_id:
        tenders = [t for t in tenders if t["tender_id"] == tender_id]

    # 1. Common Address Detection
    address_groups: dict[str, list[str]] = {}
    for bidder in MOCK_BIDDERS:
        addr = bidder["address"].strip().lower()
        address_groups.setdefault(addr, []).append(bidder["id"])

    for addr, bidder_ids in address_groups.items():
        if len(bidder_ids) > 1:
            names = [bidder_map[bid]["name"] for bid in bidder_ids]
            clusters.append(SuspectCluster(
                cluster_id=f"addr-{hash(addr) % 10000:04d}",
                bidder_ids=bidder_ids,
                bidder_names=names,
                signals=["SHARED_ADDRESS"],
                risk_score=78,
                evidence={"shared_address": addr, "count": len(bidder_ids)},
            ))
            for i in range(len(bidder_ids)):
                for j in range(i + 1, len(bidder_ids)):
                    edges.append(RelationshipEdge(
                        source_bidder_id=bidder_ids[i],
                        target_bidder_id=bidder_ids[j],
                        source_name=names[i],
                        target_name=names[j],
                        relationship_type="SHARED_ADDRESS",
                        strength=0.85,
                        details=f"Both registered at: {addr}",
                    ))

    # 2. PAN Cluster Analysis (similar prefixes = same entity group)
    pan_groups: dict[str, list[str]] = {}
    for bidder in MOCK_BIDDERS:
        prefix = bidder["pan"][:5]
        pan_groups.setdefault(prefix, []).append(bidder["id"])

    for prefix, bidder_ids in pan_groups.items():
        if len(bidder_ids) > 1:
            names = [bidder_map[bid]["name"] for bid in bidder_ids]
            # Check if already in a cluster
            existing = [c for c in clusters if set(c.bidder_ids) == set(bidder_ids)]
            if existing:
                existing[0].signals.append("PAN_CLUSTER")
                existing[0].risk_score = min(95, existing[0].risk_score + 15)
            else:
                clusters.append(SuspectCluster(
                    cluster_id=f"pan-{prefix}",
                    bidder_ids=bidder_ids,
                    bidder_names=names,
                    signals=["PAN_CLUSTER"],
                    risk_score=65,
                    evidence={"pan_prefix": prefix, "pans": [bidder_map[b]["pan"] for b in bidder_ids]},
                ))
            for i in range(len(bidder_ids)):
                for j in range(i + 1, len(bidder_ids)):
                    edges.append(RelationshipEdge(
                        source_bidder_id=bidder_ids[i],
                        target_bidder_id=bidder_ids[j],
                        source_name=names[i],
                        target_name=names[j],
                        relationship_type="PAN_CLUSTER",
                        strength=0.7,
                        details=f"Similar PAN prefix: {prefix}",
                    ))

    # 3. Rotation Pattern Detection
    co_occurrence: dict[tuple[str, str], int] = {}
    for t in tenders:
        bidders = t["bidders"]
        for i in range(len(bidders)):
            for j in range(i + 1, len(bidders)):
                pair = (min(bidders[i], bidders[j]), max(bidders[i], bidders[j]))
                co_occurrence[pair] = co_occurrence.get(pair, 0) + 1

    for (b1, b2), count in co_occurrence.items():
        if count >= 3:
            edges.append(RelationshipEdge(
                source_bidder_id=b1,
                target_bidder_id=b2,
                source_name=bidder_map[b1]["name"],
                target_name=bidder_map[b2]["name"],
                relationship_type="ROTATION_PATTERN",
                strength=min(1.0, count / len(tenders)),
                details=f"Co-appeared in {count}/{len(tenders)} tenders",
            ))

    # 4. Price Coordination Detection
    for t_id, amounts in MOCK_BID_AMOUNTS.items():
        if tender_id and t_id != tender_id:
            continue
        sorted_bids = sorted(amounts.items(), key=lambda x: x[1])
        if len(sorted_bids) >= 2:
            lowest = sorted_bids[0][1]
            second = sorted_bids[1][1]
            spread_pct = (second - lowest) / lowest * 100
            if spread_pct < 2.0:
                b1_id, b2_id = sorted_bids[0][0], sorted_bids[1][0]
                edges.append(RelationshipEdge(
                    source_bidder_id=b1_id,
                    target_bidder_id=b2_id,
                    source_name=bidder_map[b1_id]["name"],
                    target_name=bidder_map[b2_id]["name"],
                    relationship_type="PRICE_COORDINATION",
                    strength=0.9,
                    details=f"Bid spread only {spread_pct:.1f}% in tender {t_id} (₹{lowest:,.0f} vs ₹{second:,.0f})",
                ))

    # Determine overall risk
    max_cluster_risk = max((c.risk_score for c in clusters), default=0)
    overall = "HIGH" if max_cluster_risk >= 70 else "MEDIUM" if max_cluster_risk >= 40 else "LOW"

    summary_parts = []
    if any("SHARED_ADDRESS" in c.signals for c in clusters):
        summary_parts.append("shared registered addresses detected")
    if any("PAN_CLUSTER" in c.signals for c in clusters):
        summary_parts.append("PAN number clustering found")
    if any(e.relationship_type == "ROTATION_PATTERN" for e in edges):
        summary_parts.append("bid rotation patterns observed")
    if any(e.relationship_type == "PRICE_COORDINATION" for e in edges):
        summary_parts.append("suspiciously close pricing detected")

    return BidRiggingReport(
        total_tenders_analyzed=len(tenders),
        total_bidders_analyzed=len(set(b for t in tenders for b in t["bidders"])),
        suspect_clusters=clusters,
        relationship_edges=edges,
        overall_risk=overall,
        summary=f"Analysis of {len(tenders)} tenders found: {'; '.join(summary_parts) or 'no suspicious patterns'}.",
    )
