"""Canonical audit payloads and deterministic chain verification."""

import hashlib
import json
from datetime import UTC, datetime
from uuid import UUID

from pydantic import JsonValue


def event_hash(
    *,
    event_id: UUID,
    application_id: UUID,
    actor: str,
    action: str,
    before: dict[str, JsonValue] | None,
    after: dict[str, JsonValue] | None,
    previous: str | None,
    timestamp: datetime,
) -> str:
    if timestamp.tzinfo is None:
        raise ValueError("Audit timestamps must have a timezone.")
    payload = {
        "id": str(event_id),
        "application_id": str(application_id),
        "actor": actor,
        "action": action,
        "before": before,
        "after": after,
        "event_at": timestamp.astimezone(UTC).isoformat(timespec="microseconds"),
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(((previous or "") + canonical).encode("utf-8")).hexdigest()
