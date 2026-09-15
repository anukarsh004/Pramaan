import hashlib
import json
from uuid import UUID

from pydantic import JsonValue
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.entities import AuditEvent


class AuditRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def log_event(
        self,
        application_id: UUID,
        actor: str,
        action: str,
        before_state: dict[str, JsonValue] | None = None,
        after_state: dict[str, JsonValue] | None = None,
        prev_event_hash: str | None = None,
    ) -> AuditEvent:
        event_data = {
            "application_id": str(application_id),
            "actor": actor,
            "action": action,
            "before_state": before_state,
            "after_state": after_state,
            "prev_event_hash": prev_event_hash,
        }
        event_hash = hashlib.sha256(
            json.dumps(event_data, sort_keys=True).encode("utf-8")
        ).hexdigest()

        event = AuditEvent(
            application_id=application_id,
            actor=actor,
            action=action,
            before_state=before_state,
            after_state=after_state,
            prev_event_hash=prev_event_hash,
            event_hash=event_hash,
        )
        self.session.add(event)
        await self.session.flush()
        return event
