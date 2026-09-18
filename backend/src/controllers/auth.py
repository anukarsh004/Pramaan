from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.settings import Settings
from src.controllers.dependencies import Actor, require_csrf
from src.domain.contracts import Role
from src.models.entities import (
    EmailVerificationToken,
    PasswordResetToken,
    RefreshTokenSession,
    User,
)
from src.repositories.database import session_dependency
from src.services.auth_service import (
    create_access_token,
    generate_secure_token,
    get_password_hash,
    hash_token,
    verify_password,
)

router = APIRouter(tags=["Auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12)
    full_name: str
    role: Role = Role.OFFICER


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class CurrentUserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    is_verified: bool


class VerifyEmailRequest(BaseModel):
    token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=12)


@router.post("/auth/register")
async def register(
    req: RegisterRequest,
    session: Annotated[AsyncSession, Depends(session_dependency)],
):
    # Check if user already exists
    existing_user = await session.scalar(select(User).where(User.email == req.email))
    if existing_user:
        # Don't reveal account existence; pretend success
        return {"message": "If this email is valid, an account has been created."}

    user = User(
        email=req.email,
        password_hash=get_password_hash(req.password),
        full_name=req.full_name,
        role=req.role.value,
        is_active=True,
        is_verified=False,
    )
    session.add(user)
    await session.flush()
    
    raw_token = generate_secure_token()
    verify_token = EmailVerificationToken(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(UTC) + timedelta(days=1),
    )
    session.add(verify_token)
    await session.commit()
    
    import logging
    logging.getLogger(__name__).info(f"Verification token for {user.email}: {raw_token}")

    return {"message": "Account created. Please check your email for verification."}


@router.post("/auth/login")
async def login(
    req: LoginRequest,
    response: Response,
    request: Request,
    session: Annotated[AsyncSession, Depends(session_dependency)],
):
    settings: Settings = request.app.state.settings
    user = await session.scalar(select(User).where(User.email == req.email))
    
    if not user or not user.is_active or user.deleted_at is not None:
        raise HTTPException(401, detail="Invalid email or password")
        
    if user.locked_until and user.locked_until > datetime.now(UTC):
        raise HTTPException(401, detail="Account locked. Try again later.")

    if not verify_password(req.password, user.password_hash):
        user.failed_login_count += 1
        if user.failed_login_count >= 5:
            user.locked_until = datetime.now(UTC) + timedelta(minutes=15)
        await session.commit()
        raise HTTPException(401, detail="Invalid email or password")

    # Success
    user.failed_login_count = 0
    user.last_login_at = datetime.now(UTC)
    
    # Generate tokens
    access_token = create_access_token(user.id, settings)
    raw_refresh_token = generate_secure_token()
    
    # Save refresh token session
    rt_session = RefreshTokenSession(
        user_id=user.id,
        token_hash=hash_token(raw_refresh_token),
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    session.add(rt_session)
    await session.commit()

    # Generate CSRF
    raw_csrf = generate_secure_token()

    # Set cookies
    cookie_kwargs = {
        "httponly": True,
        "secure": settings.cookie_secure,
        "samesite": "lax",
    }
    
    response.set_cookie("access_token", access_token, max_age=15 * 60, **cookie_kwargs)
    response.set_cookie("refresh_token", raw_refresh_token, max_age=7 * 24 * 3600, path="/api/auth/refresh", **cookie_kwargs)
    # CSRF cookie is NOT httponly so JS can read it and send it in headers
    response.set_cookie("csrf_token", raw_csrf, max_age=7 * 24 * 3600, secure=settings.cookie_secure, samesite="lax")

    return {"message": "Logged in", "role": user.role, "csrf_token": raw_csrf}


@router.post("/auth/refresh")
async def refresh(
    response: Response,
    request: Request,
    refresh_token: Annotated[str | None, Cookie()] = None,
    session: Annotated[AsyncSession, Depends(session_dependency)] = None,
):
    if not refresh_token:
        raise HTTPException(401, detail="Missing refresh token")
        
    settings: Settings = request.app.state.settings
    hashed_rt = hash_token(refresh_token)
    
    rt_record = await session.scalar(
        select(RefreshTokenSession).where(RefreshTokenSession.token_hash == hashed_rt)
    )
    
    if not rt_record or rt_record.revoked_at or rt_record.expires_at < datetime.now(UTC):
        # If revoked, it could be a replay attack. (For simplicity, just reject)
        raise HTTPException(401, detail="Invalid or expired refresh token")
        
    # Rotate token
    rt_record.revoked_at = datetime.now(UTC)
    
    user = await session.get(User, rt_record.user_id)
    if not user or not user.is_active:
        raise HTTPException(401, detail="User inactive")
        
    # Issue new tokens
    access_token = create_access_token(user.id, settings)
    new_raw_refresh_token = generate_secure_token()
    
    new_rt_session = RefreshTokenSession(
        user_id=user.id,
        token_hash=hash_token(new_raw_refresh_token),
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    session.add(new_rt_session)
    await session.commit()
    
    cookie_kwargs = {
        "httponly": True,
        "secure": settings.cookie_secure,
        "samesite": "lax",
    }
    
    response.set_cookie("access_token", access_token, max_age=15 * 60, **cookie_kwargs)
    response.set_cookie("refresh_token", new_raw_refresh_token, max_age=7 * 24 * 3600, path="/api/auth/refresh", **cookie_kwargs)
    
    return {"message": "Token refreshed"}


@router.post("/auth/logout")
async def logout(
    response: Response,
    refresh_token: Annotated[str | None, Cookie()] = None,
    session: Annotated[AsyncSession, Depends(session_dependency)] = None,
):
    if refresh_token:
        hashed_rt = hash_token(refresh_token)
        rt_record = await session.scalar(
            select(RefreshTokenSession).where(RefreshTokenSession.token_hash == hashed_rt)
        )
        if rt_record:
            rt_record.revoked_at = datetime.now(UTC)
            await session.commit()
            
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token", path="/api/auth/refresh")
    response.delete_cookie("csrf_token")
    return {"message": "Logged out"}


@router.get("/auth/me", response_model=CurrentUserResponse)
async def get_me(actor: Actor, session: Annotated[AsyncSession, Depends(session_dependency)]):
    user = await session.get(User, actor.id)
    if not user:
        raise HTTPException(404)
    return CurrentUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_verified=user.is_verified,
    )


@router.post("/auth/verify-email")
async def verify_email(
    req: VerifyEmailRequest,
    session: Annotated[AsyncSession, Depends(session_dependency)],
):
    hashed_token = hash_token(req.token)
    token_record = await session.scalar(
        select(EmailVerificationToken).where(EmailVerificationToken.token_hash == hashed_token)
    )
    if not token_record or token_record.expires_at < datetime.now(UTC):
        raise HTTPException(400, detail="Invalid or expired token")

    user = await session.get(User, token_record.user_id)
    if user:
        user.is_verified = True
        session.delete(token_record)
        await session.commit()
    return {"message": "Email successfully verified."}


@router.post("/auth/forgot-password")
async def forgot_password(
    req: ForgotPasswordRequest,
    session: Annotated[AsyncSession, Depends(session_dependency)],
):
    user = await session.scalar(select(User).where(User.email == req.email))
    if user:
        raw_token = generate_secure_token()
        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=datetime.now(UTC) + timedelta(hours=1),
        )
        session.add(reset_token)
        await session.commit()
        
        import logging
        logging.getLogger(__name__).info(f"Password reset token for {user.email}: {raw_token}")
        
    return {"message": "If this email is registered, a password reset link has been sent."}


@router.post("/auth/reset-password")
async def reset_password(
    req: ResetPasswordRequest,
    session: Annotated[AsyncSession, Depends(session_dependency)],
):
    hashed_token = hash_token(req.token)
    token_record = await session.scalar(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == hashed_token)
    )
    if not token_record or token_record.expires_at < datetime.now(UTC):
        raise HTTPException(400, detail="Invalid or expired token")

    user = await session.get(User, token_record.user_id)
    if user:
        user.password_hash = get_password_hash(req.new_password)
        user.failed_login_count = 0
        user.locked_until = None
        session.delete(token_record)
        await session.commit()
    return {"message": "Password successfully reset."}
