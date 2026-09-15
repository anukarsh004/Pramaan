"""Audit writes participate in the caller's locked case transaction."""

from uuid import UUID, uuid4

from pydantic import JsonValue
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.audit import event_hash
from src.models.entities import AuditEvent, BidApplication, now


async def append_event(
    session: AsyncSession,
    application_id: UUID,
    actor: str,
    action: str,
    before: dict[str, JsonValue] | None,
    after: dict[str, JsonValue] | None,
) -> AuditEvent:
    await session.execute(
        select(BidApplication.id).where(BidApplication.id == application_id).with_for_update()
    )
    previous = await session.scalar(
        select(AuditEvent)
        .where(AuditEvent.application_id == application_id)
        .order_by(AuditEvent.event_at.desc(), AuditEvent.id.desc())
        .limit(1)
    )
    timestamp = now()
    if previous and timestamp <= previous.event_at:
        from datetime import timedelta

        timestamp = previous.event_at + timedelta(microseconds=1)
    identifier = uuid4()
    previous_hash = previous.event_hash if previous else None
    event = AuditEvent(
        id=identifier,
        application_id=application_id,
        actor=actor,
        action=action,
        before_state=before,
        after_state=after,
        prev_event_hash=previous_hash,
        event_at=timestamp,
        event_hash=event_hash(
            event_id=identifier, application_id=application_id, actor=actor, action=action,
            before=before, after=after, previous=previous_hash, timestamp=timestamp,
        ),
    )
    session.add(event)
    await session.flush()
    return event


def verify_events(events: list[AuditEvent]) -> bool:
    previous: str | None = None
    for event in events:
        if event.prev_event_hash != previous:
            return False
        expected = event_hash(
            event_id=event.id, application_id=event.application_id, actor=event.actor,
            action=event.action, before=event.before_state, after=event.after_state,
            previous=previous, timestamp=event.event_at,
        )
        if expected != event.event_hash:
            return False
        previous = event.event_hash
    return True
