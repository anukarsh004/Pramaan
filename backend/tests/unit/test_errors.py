import asyncio
import json
from uuid import UUID

from starlette.requests import Request

from src.errors import error_response, handle_http_error


def test_error_response_creates_missing_request_id() -> None:
    request = Request({"type": "http", "method": "GET", "path": "/"})
    response = error_response(request, 400, "INVALID_INPUT", "Invalid request.")
    body = json.loads(bytes(response.body))
    assert UUID(response.headers["X-Request-ID"]).version == 4
    assert request.state.request_id == response.headers["X-Request-ID"]
    assert body["error"]["request_id"] == request.state.request_id


def test_wrong_exception_type_uses_unexpected_error_handler() -> None:
    request = Request({"type": "http", "method": "GET", "path": "/"})
    response = asyncio.run(handle_http_error(request, ValueError("internal detail")))
    assert response.status_code == 500
    assert b"internal detail" not in response.body
    assert json.loads(bytes(response.body))["error"]["code"] == "INTERNAL_ERROR"
