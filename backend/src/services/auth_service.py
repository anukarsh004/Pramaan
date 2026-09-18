import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from passlib.context import CryptContext

from src.config.settings import Settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(subject: str | UUID, settings: Settings) -> str:
    if settings.access_token_secret is None:
        raise ValueError("ACCESS_TOKEN_SECRET must be set")
    
    expire = datetime.now(UTC) + timedelta(minutes=15)
    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "iss": "pramaan",
        "aud": "pramaan-api",
    }
    encoded_jwt = jwt.encode(
        to_encode,
        settings.access_token_secret.get_secret_value(),
        algorithm="HS256"
    )
    return encoded_jwt


def generate_secure_token(length: int = 43) -> str:
    """Generates a secure random token, suitable for refresh tokens or reset tokens."""
    return secrets.token_urlsafe(length)


def hash_token(token: str) -> str:
    """Uses SHA-256 to hash a token for secure database storage."""
    import hashlib
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
