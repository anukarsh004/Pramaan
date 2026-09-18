"""Identity and unit-of-work dependencies for protected application routes."""

import asyncio
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, Header, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from collections.abc import AsyncIterator
from src.config.settings import Settings
from src.domain.contracts import Role
from src.models.entities import User
from src.repositories.database import Database, session_dependency

Session = Annotated[AsyncSession, Depends(session_dependency)]
bearer = HTTPBearer(auto_error=False)


async def optional_session_dependency(request: Request) -> AsyncIterator[AsyncSession | None]:
    database = getattr(request.app.state, "database", None)
    if not isinstance(database, Database):
        yield None
        return
    async with database.sessions() as session:
        async with session.begin():
            yield session

# Well-known dev user for auth bypass
DEV_OFFICER_ID = UUID("00000000-0000-4000-a000-000000000001")
DEV_ADMIN_ID = UUID("00000000-0000-4000-a000-000000000002")
DEV_BIDDER_ID = UUID("00000000-0000-4000-a000-000000000003")
DEV_VIGILANCE_ID = UUID("00000000-0000-4000-a000-000000000004")

DEV_USERS: dict[str, "Principal"] = {
    "officer": None,  # type: ignore[assignment]
    "admin": None,  # type: ignore[assignment]
    "bidder": None,  # type: ignore[assignment]
    "vigilance": None,  # type: ignore[assignment]
}


class AccessClaims(BaseModel):
    sub: str = Field(min_length=1, max_length=255)
    exp: int
    amr: list[str] = Field(default_factory=list)


class Principal(BaseModel):
    id: UUID
    sub: str
    full_name: str
    role: Role


# Lazy-init dev users after class is defined
DEV_USERS["officer"] = Principal(
    id=DEV_OFFICER_ID, sub="dev-officer", full_name="Dev Officer", role=Role.OFFICER
)
DEV_USERS["admin"] = Principal(
    id=DEV_ADMIN_ID, sub="dev-admin", full_name="Dev Admin", role=Role.ADMIN
)
DEV_USERS["bidder"] = Principal(
    id=DEV_BIDDER_ID, sub="dev-bidder", full_name="Dev Bidder", role=Role.BIDDER
)
DEV_USERS["vigilance"] = Principal(
    id=DEV_VIGILANCE_ID, sub="dev-vigilance", full_name="Dev Vigilance", role=Role.VIGILANCE
)


async def current_user(
    request: Request,
    session: Annotated[AsyncSession | None, Depends(optional_session_dependency)],
) -> Principal:
    settings: Settings = request.app.state.settings

    # Dev auth bypass: accept X-Dev-Role header
    if settings.dev_auth_bypass and "X-Dev-Role" in request.headers:
        dev_role = request.headers.get("X-Dev-Role", "officer").lower()
        principal = DEV_USERS.get(dev_role)
        if principal:
            return principal

    access_token = request.cookies.get("access_token")
    if not access_token:
        # Fallback to Authorization header for API clients (if needed)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            access_token = auth_header.split(" ")[1]

    if not access_token:
        raise HTTPException(401, detail="Authentication required")

    if not settings.access_token_secret:
        raise HTTPException(503, detail="ACCESS_TOKEN_SECRET not configured")

    try:
        claims = AccessClaims.model_validate(
            jwt.decode(
                access_token,
                settings.access_token_secret.get_secret_value(),
                algorithms=["HS256"],
                audience="pramaan-api",
                issuer="pramaan",
                options={"require": ["exp", "sub", "iss", "aud"]},
            )
        )
    except (jwt.PyJWTError, ValueError) as exc:
        raise HTTPException(401, detail="Invalid or expired token") from exc

    if session is None:
        raise HTTPException(503)

    user = await session.get(User, UUID(claims.sub))
    if user is None or not user.is_active or user.deleted_at is not None:
        raise HTTPException(403, detail="User account disabled or deleted")

    return Principal(id=user.id, sub=claims.sub, full_name=user.full_name, role=Role(user.role))


Actor = Annotated[Principal, Depends(current_user)]





async def require_csrf(
    request: Request,
    actor: Actor,
    x_csrf_token: Annotated[str | None, Header()] = None,
) -> None:
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return
    settings: Settings = request.app.state.settings
    if settings.dev_auth_bypass and "X-Dev-Role" in request.headers:
        return  # Skip CSRF in dev mode
        
    cookie_csrf = request.cookies.get("csrf_token")
    if not cookie_csrf or not x_csrf_token or cookie_csrf != x_csrf_token:
        raise HTTPException(403, detail="CSRF token validation failed")


def require_role(allowed_roles: set[Role]):
    """Returns a dependency that asserts the current user has one of the allowed roles."""
    def role_checker(actor: Actor) -> Principal:
        if actor.role not in allowed_roles:
            raise HTTPException(403, detail="Insufficient permissions")
        return actor
    return Depends(role_checker)

