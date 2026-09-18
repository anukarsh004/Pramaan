"""Celery worker entry point.

Run with: celery -A src.worker.celery_app worker --loglevel=info
"""

import asyncio
from celery import Celery
from src.config.settings import Settings

settings = Settings()

celery_app = Celery(
    "pramaan_worker",
    broker=settings.redis_url or "redis://127.0.0.1:6379/0",
    backend=settings.redis_url or "redis://127.0.0.1:6379/0",
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Example task for document processing
@celery_app.task(name="process_application")
def process_application_task(application_id: str, rule_set_id: str, actor_id: str, actor_sub: str, actor_name: str, actor_role: str):
    """
    Async task to run the processing pipeline.
    Because SQLAlchemy AsyncSession requires an event loop, we wrap it here.
    """
    from src.domain.contracts import Role
    from src.controllers.dependencies import Principal
    from src.services.processing import run_mock_pipeline
    from src.repositories.database import Database
    from uuid import UUID

    # Reconstruct the actor Principal from dict-friendly args
    actor = Principal(
        id=UUID(actor_id),
        sub=actor_sub,
        full_name=actor_name,
        role=Role(actor_role)
    )

    async def _run():
        if not settings.database_url:
            return
        
        database = Database(settings.database_url.get_secret_value())
        await database.initialize()
        
        try:
            async with database.sessions() as session:
                async with session.begin():
                    await run_mock_pipeline(
                        session=session,
                        application_id=UUID(application_id),
                        rule_set_id=UUID(rule_set_id),
                        actor=actor,
                    )
        finally:
            await database.close()

    # Celery tasks are synchronous, so we run the asyncio event loop
    asyncio.run(_run())


@celery_app.task(name="analyze_document_tamper")
def analyze_document_tamper_task(application_id: str):
    """Async task to run document tamper analysis."""
    from src.services.doc_tamper import analyze_document_tamper
    
    # In a real scenario, this might also write to the database.
    # Currently it just computes the mock report.
    report = analyze_document_tamper(application_id)
    return report.model_dump(mode="json")
