"""Tests for intelligence endpoints: bid-rigging, doc tamper, health check, cross-tender."""

import pytest
from fastapi.testclient import TestClient

from src.config.settings import Settings
from src.main import create_app


@pytest.fixture
def client() -> TestClient:
    settings = Settings(environment="testing", dev_auth_bypass=True)
    app = create_app(settings)
    return TestClient(app)


def test_bid_rigging_officer_access(client: TestClient) -> None:
    response = client.get(
        "/api/v1/intelligence/bid-rigging",
        headers={"X-Dev-Role": "officer"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "suspect_clusters" in data["data"]
    assert "relationship_edges" in data["data"]
    assert len(data["data"]["suspect_clusters"]) > 0


def test_bid_rigging_unauthorized_bidder(client: TestClient) -> None:
    response = client.get(
        "/api/v1/intelligence/bid-rigging",
        headers={"X-Dev-Role": "bidder"},
    )
    assert response.status_code == 403


def test_doc_tamper_analysis(client: TestClient) -> None:
    response = client.get(
        "/api/v1/intelligence/doc-tamper/app-001",
        headers={"X-Dev-Role": "officer"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["documents_analyzed"] > 0
    assert "document_risks" in data["data"]
    assert "name_comparisons" in data["data"]


def test_health_check_bidder_access(client: TestClient) -> None:
    response = client.get(
        "/api/v1/intelligence/health-check/app-demo-123",
        headers={"X-Dev-Role": "bidder"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "readiness_pct" in data["data"]
    assert "checklist" in data["data"]
    assert "warnings" in data["data"]
    assert data["data"]["readiness_pct"] == 87  # matches 87% requirement


def test_cross_tender_analysis(client: TestClient) -> None:
    response = client.get(
        "/api/v1/intelligence/cross-tender/bid-001",
        headers={"X-Dev-Role": "officer"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "stats" in data["data"]
    assert "participations" in data["data"]
    assert "score_trend" in data["data"]
    assert "red_flag_timeline" in data["data"]
