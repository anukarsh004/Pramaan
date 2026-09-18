"""Non-secret application settings loaded from the process environment."""

from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=False,
        populate_by_name=True,
        extra="ignore",
        frozen=True,
        env_file=".env",
        env_file_encoding="utf-8",
    )

    environment: Literal["development", "testing", "staging", "production"] = Field(
        default="development", validation_alias="ENV"
    )
    database_url: SecretStr | None = Field(
        default="sqlite+aiosqlite:///./pramaan_dev.db",
        description="Database URL (defaults to SQLite for development)"
    )
    keycloak_issuer: str | None = None
    keycloak_audience: str = "pramaan-api"
    csrf_secret: SecretStr | None = Field(default=None, min_length=32)
    access_token_secret: SecretStr | None = Field(default=None, min_length=32)
    refresh_token_secret: SecretStr | None = Field(default=None, min_length=32)
    cookie_secure: bool = Field(default=False, description="Set to True in production to enforce HTTPS cookies")
    frontend_origin: str = "http://localhost:5173"
    dev_auth_bypass: bool = Field(default=True, description="Enable dev-mode auth bypass")
    storage_path: str = Field(default="./uploads", description="Local file storage directory")
    redis_url: str | None = Field(default="redis://127.0.0.1:6379/0", description="Redis URL for Celery")
    
    # MinIO / S3 Settings
    s3_endpoint_url: str | None = Field(default="http://127.0.0.1:9000", description="MinIO/S3 endpoint URL")
    s3_access_key: str | None = Field(default="pramaan", description="MinIO/S3 access key")
    s3_secret_key: SecretStr | None = Field(default="pramaan_secret", description="MinIO/S3 secret key")
    s3_bucket: str = Field(default="pramaan", description="S3 bucket for document storage")
