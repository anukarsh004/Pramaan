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
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    session: Annotated[AsyncSession | None, Depends(optional_session_dependency)],
) -> Principal:
    settings: Settings = request.app.state.settings

    # Dev auth bypass: accept X-Dev-Role header
    if settings.dev_auth_bypass:
        dev_role = request.headers.get("X-Dev-Role", "officer").lower()
        principal = DEV_USERS.get(dev_role)
        if principal:
            return principal
        raise HTTPException(400, detail="Invalid X-Dev-Role; use officer/admin/bidder/vigilance")

    if credentials is None:
        raise HTTPException(401, headers={"WWW-Authenticate": "Bearer"})
    if not settings.keycloak_issuer:
        raise HTTPException(503)
    client = getattr(request.app.state, "jwks_client", None)
    if not isinstance(client, jwt.PyJWKClient):
        raise HTTPException(503)
    try:
        signing_key = await asyncio.to_thread(
            client.get_signing_key_from_jwt, credentials.credentials
        )
        claims = AccessClaims.model_validate(
            jwt.decode(
                credentials.credentials,
                signing_key.key,
                algorithms=["RS256"],
                audience=settings.keycloak_audience,
                issuer=settings.keycloak_issuer,
                options={"require": ["exp", "sub", "iss", "aud"]},
            )
        )
    except jwt.PyJWKClientConnectionError as exc:
        raise HTTPException(503) from exc
    except (jwt.PyJWTError, ValueError) as exc:
        raise HTTPException(401, headers={"WWW-Authenticate": "Bearer"}) from exc
    if session is None:
        raise HTTPException(503)
    user = await session.scalar(select(User).where(User.keycloak_sub == claims.sub))
    if user is None or not user.is_active or user.deleted_at is not None:
        raise HTTPException(403)
    if user.role in {Role.OFFICER, Role.ADMIN} and not {"otp", "mfa"}.intersection(claims.amr):
        raise HTTPException(403)
    return Principal(id=user.id, sub=claims.sub, full_name=user.full_name, role=Role(user.role))


Actor = Annotated[Principal, Depends(current_user)]


def csrf_token(settings: Settings, principal: Principal) -> str:
    if settings.csrf_secret is None:
        if settings.dev_auth_bypass:
            return "dev-csrf-token"
        raise HTTPException(503)
    return jwt.encode(
        {"sub": principal.sub, "exp": datetime.now(UTC) + timedelta(minutes=15), "aud": "csrf"},
        settings.csrf_secret.get_secret_value(),
        algorithm="HS256",
    )


async def require_csrf(
    request: Request,
    actor: Actor,
    x_csrf_token: Annotated[str | None, Header()] = None,
) -> None:
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return
    settings: Settings = request.app.state.settings
    if settings.dev_auth_bypass:
        return  # Skip CSRF in dev mode
    if settings.csrf_secret is None:
        raise HTTPException(503)
    if x_csrf_token is None:
        raise HTTPException(403)
    try:
        claims = jwt.decode(
            x_csrf_token,
            settings.csrf_secret.get_secret_value(),
            algorithms=["HS256"],
            audience="csrf",
            options={"require": ["sub", "exp", "aud"]},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(403) from exc
    if claims["sub"] != actor.sub:
        raise HTTPException(403)
