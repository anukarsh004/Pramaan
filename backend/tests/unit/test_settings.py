import pytest
from pydantic import ValidationError

from src.config.settings import Settings


def test_default_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ENV", raising=False)
    assert Settings().environment == "development"


def test_environment_override(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENV", "production")
    assert Settings().environment == "production"


def test_invalid_environment_prevents_startup(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENV", "unsupported")
    with pytest.raises(ValidationError):
        Settings()


def test_settings_are_immutable() -> None:
    settings = Settings(environment="testing")
    with pytest.raises(ValidationError):
        settings.environment = "production"
