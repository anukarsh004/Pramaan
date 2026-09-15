from uuid import UUID

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel, ConfigDict

from src.config.settings import Settings
from src.main import create_app


@pytest.fixture
def application() -> FastAPI:
    return create_app(Settings(environment="testing"))


def test_health_is_liveness_only(application: FastAPI) -> None:
    with TestClient(application) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert UUID(response.headers["X-Request-ID"]).version == 4


@pytest.mark.parametrize("path", ["/missing", "/docs", "/redoc", "/api/v1/openapi.json"])
def test_unknown_routes_have_consistent_error(application: FastAPI, path: str) -> None:
    with TestClient(application) as client:
        response = client.get(path)
    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "NOT_FOUND"
    assert body["error"]["request_id"] == response.headers["X-Request-ID"]


def test_method_error_preserves_allow_header(application: FastAPI) -> None:
    with TestClient(application) as client:
        response = client.post("/health")
    assert response.status_code == 405
    assert "GET" in response.headers["Allow"]
    assert response.json()["error"]["code"] == "METHOD_NOT_ALLOWED"


def test_request_ids_are_fresh(application: FastAPI) -> None:
    with TestClient(application) as client:
        first = client.get("/health", headers={"X-Request-ID": "client-supplied"})
        second = client.get("/health")
    assert first.headers["X-Request-ID"] != "client-supplied"
    assert first.headers["X-Request-ID"] != second.headers["X-Request-ID"]


class TestPayload(BaseModel):
    __test__ = False
    model_config = ConfigDict(extra="forbid", strict=True)
    count: int


@pytest.mark.parametrize("payload", [{"count": "not-a-number"}, {}, {"count": 1, "extra": 2}])
def test_validation_uses_standard_envelope(
    application: FastAPI, payload: dict[str, object]
) -> None:
    @application.post("/test-input")
    async def input_route(body: TestPayload) -> TestPayload:
        return body

    with TestClient(application) as client:
        response = client.post("/test-input", json=payload)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_INPUT"
    assert "not-a-number" not in response.text


@pytest.mark.parametrize("status", [400, 401, 403, 409, 413, 418, 429, 503])
def test_http_errors_do_not_echo_internal_detail(application: FastAPI, status: int) -> None:
    @application.get("/test-http-error")
    async def failing_route() -> None:
        raise HTTPException(status_code=status, detail="internal-detail-not-for-client")

    with TestClient(application) as client:
        response = client.get("/test-http-error")
    assert response.status_code == status
    assert response.json()["success"] is False
    assert "internal-detail-not-for-client" not in response.text


def test_unexpected_error_is_correlated_and_logged(
    application: FastAPI, caplog: pytest.LogCaptureFixture
) -> None:
    @application.get("/test-unexpected-error")
    async def failing_route() -> None:
        raise RuntimeError("internal-detail-not-for-client")

    with TestClient(application, raise_server_exceptions=False) as client:
        response = client.get("/test-unexpected-error")
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "INTERNAL_ERROR"
    request_id = response.headers["X-Request-ID"]
    assert response.json()["error"]["request_id"] == request_id
    assert request_id in caplog.text
    assert "RuntimeError" in caplog.text
    assert "internal-detail-not-for-client" not in response.text
    assert "internal-detail-not-for-client" not in caplog.text


def test_factory_keeps_settings_and_routes_isolated(application: FastAPI) -> None:
    other = create_app(Settings(environment="staging"))
    assert application.state.settings.environment == "testing"
    assert other.state.settings.environment == "staging"
    assert application is not other
    assert application.router is not other.router
    assert other.debug is False
