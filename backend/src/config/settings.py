"""Non-secret application settings loaded from the process environment."""

from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=False,
        populate_by_name=True,
        extra="forbid",
        frozen=True,
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
    frontend_origin: str = "http://localhost:5173"
    dev_auth_bypass: bool = Field(default=True, description="Enable dev-mode auth bypass")
    storage_path: str = Field(default="./uploads", description="Local file storage directory")
    redis_url: str | None = None
