"""Document upload, retrieval, and application submission routes."""

import os
import shutil
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from pydantic import JsonValue
from sqlalchemy import select

from src.controllers.dependencies import Actor, Session, require_csrf
from src.domain.contracts import CaseStatus, Role
from src.models.entities import BidApplication, Document, now
from src.repositories.audit import append_event
from src.repositories.cases import get_case

router = APIRouter(tags=["documents"])

ALLOWED_TYPES = {"application/pdf", "image/png", "image/jpeg", "image/jpg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post(
    "/bid-applications/{application_id}/documents",
    status_code=201,
    dependencies=[Depends(require_csrf)],
)
async def upload_document(
    application_id: UUID,
    request: Request,
    session: Session,
    actor: Actor,
    file: UploadFile | None = None,
    doc_type: str = "general",
) -> dict[str, JsonValue]:
    if actor.role not in {Role.OFFICER, Role.BIDDER}:
        raise HTTPException(403)

    application = await get_case(session, application_id, actor, lock=True)
    if application.status == CaseStatus.CLOSED:
        raise HTTPException(409, detail="Cannot upload to a closed application")

    if file is None:
        raise HTTPException(400, detail="No file provided")

    # Validate file type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            400, detail=f"Unsupported file type: {content_type}. Use PDF, PNG, or JPEG."
        )

    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, detail="File exceeds 10 MB limit")
    if len(content) == 0:
        raise HTTPException(400, detail="Empty file")

    # Determine version
    latest = await session.scalar(
        select(Document.version)
        .where(
            Document.application_id == application_id,
            Document.doc_type == doc_type,
        )
        .order_by(Document.version.desc())
        .limit(1)
    )
    version = (latest or 0) + 1

    # Save file to local storage
    settings = request.app.state.settings
    storage_dir = Path(settings.storage_path) / str(application_id)
    storage_dir.mkdir(parents=True, exist_ok=True)
    file_ext = Path(file.filename or "document").suffix or ".pdf"
    file_name = f"{doc_type}_v{version}{file_ext}"
    file_path = storage_dir / file_name
    with open(file_path, "wb") as f:
        f.write(content)

    storage_uri = f"local://{application_id}/{file_name}"

    document = Document(
        id=uuid4(),
        application_id=application_id,
        doc_type=doc_type,
        version=version,
        storage_uri=storage_uri,
        extraction_status="pending",
        uploaded_at=now(),
        uploaded_by=actor.id,
    )
    session.add(document)
    await session.flush()

    await append_event(
        session,
        application_id,
        str(actor.id),
        "DOCUMENT_UPLOADED",
        None,
        {
            "document_id": str(document.id),
            "doc_type": doc_type,
            "version": version,
            "file_name": file.filename,
        },
    )

    return {
        "success": True,
        "document_id": str(document.id),
        "doc_type": doc_type,
        "version": version,
        "extraction_status": "pending",
    }


@router.get("/documents/{document_id}")
async def get_document(
    document_id: UUID, session: Session, actor: Actor
) -> dict[str, JsonValue]:
    document = await session.get(Document, document_id)
    if document is None:
        raise HTTPException(404)
    # Verify access via case scope
    await get_case(session, document.application_id, actor)
    return {
        "success": True,
        "data": {
            "id": str(document.id),
            "application_id": str(document.application_id),
            "doc_type": document.doc_type,
            "version": document.version,
            "extraction_status": document.extraction_status,
            "extracted_fields": document.extracted_fields,
            "extraction_confidence": float(document.extraction_confidence)
            if document.extraction_confidence
            else None,
            "uploaded_at": document.uploaded_at.isoformat(),
        },
    }


@router.post(
    "/bid-applications/{application_id}/submit",
    dependencies=[Depends(require_csrf)],
)
async def submit_application(
    application_id: UUID, session: Session, actor: Actor
) -> dict[str, JsonValue]:
    application = await get_case(session, application_id, actor, lock=True)
    if application.status != CaseStatus.INTAKE_PENDING:
        raise HTTPException(409, detail="Application must be in intake_pending status to submit")

    # Per PRD: allow submission even with missing documents (warn but don't block)
    before = application.status
    application.status = CaseStatus.INTAKE_COMPLETE
    application.submitted_at = now()

    await append_event(
        session,
        application_id,
        str(actor.id),
        "APPLICATION_SUBMITTED",
        {"status": before},
        {"status": application.status},
    )

    return {"success": True, "status": application.status}


@router.post(
    "/bid-applications/{application_id}/process",
    dependencies=[Depends(require_csrf)],
)
async def trigger_processing(
    application_id: UUID, session: Session, actor: Actor
) -> dict[str, JsonValue]:
    """Trigger the processing pipeline for a submitted application."""
    if actor.role != Role.OFFICER:
        raise HTTPException(403)
    application = await get_case(session, application_id, actor, lock=True)
    if application.status != CaseStatus.INTAKE_COMPLETE:
        raise HTTPException(409, detail="Application must be submitted before processing")

    before = application.status
    application.status = CaseStatus.PROCESSING

    await append_event(
        session,
        application_id,
        str(actor.id),
        "PROCESSING_STARTED",
        {"status": before},
        {"status": application.status},
    )

    # In a full system, this would enqueue a Celery task.
    # For demo, we run mock processing synchronously.
    from src.services.processing import run_mock_pipeline

    await run_mock_pipeline(session, application_id, application.rule_set_id, actor)

    # Transition to ready_for_review
    application.status = CaseStatus.READY

    await append_event(
        session,
        application_id,
        str(actor.id),
        "PROCESSING_COMPLETE",
        {"status": CaseStatus.PROCESSING},
        {"status": CaseStatus.READY},
    )

    return {"success": True, "status": application.status}
