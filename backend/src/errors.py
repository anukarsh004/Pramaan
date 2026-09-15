"""Consistent HTTP error responses for the application boundary."""

import logging
from collections.abc import Mapping
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

logger = logging.getLogger(__name__)

HTTP_ERRORS: dict[int, tuple[str, str]] = {
    400: ("INVALID_INPUT", "The request is invalid."),
    401: ("UNAUTHENTICATED", "Sign in to continue."),
    403: ("FORBIDDEN", "You do not have permission to access this resource."),
    404: ("NOT_FOUND", "The requested resource was not found."),
    405: ("METHOD_NOT_ALLOWED", "This method is not supported for this resource."),
    409: ("CONFLICT", "The request conflicts with the current resource state."),
    413: ("PAYLOAD_TOO_LARGE", "The request exceeds the allowed size."),
    429: ("RATE_LIMITED", "Too many requests. Try again later."),
    503: ("SERVICE_UNAVAILABLE", "The service is temporarily unavailable."),
}


def error_response(
    request: Request,
    status_code: int,
    code: str,
    message: str,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    if not isinstance(request_id, str):
        request_id = str(uuid4())
        request.state.request_id = request_id
    response_headers = dict(headers or {})
    response_headers["X-Request-ID"] = request_id
    return JSONResponse(
        status_code=status_code,
        headers=response_headers,
        content={
            "success": False,
            "error": {"code": code, "message": message, "request_id": request_id},
        },
    )


async def handle_http_error(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, HTTPException):
        return await handle_unexpected_error(request, exc)
    code, message = HTTP_ERRORS.get(
        exc.status_code, ("HTTP_ERROR", "The request could not be completed.")
    )
    return error_response(request, exc.status_code, code, message, exc.headers)


async def handle_validation_error(request: Request, exc: Exception) -> JSONResponse:
    return error_response(request, 400, "INVALID_INPUT", "The request contains invalid data.")


async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    response = error_response(
        request, 500, "INTERNAL_ERROR", "The request could not be completed. Contact support."
    )
    logger.error(
        "Unhandled request error; request_id=%s exception_type=%s",
        request.state.request_id,
        type(exc).__name__,
    )
    return response


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(HTTPException, handle_http_error)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(Exception, handle_unexpected_error)
