import io
from uuid import UUID
from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.core.security import security_manager
from backend.core.pdf_redactor import AreaSelection
from backend.service.redactor_service import get_redactor_service
from backend.crud import support_crud, documents_crud, prompts_crud, selections_crud, files_crud
from backend.api.schemas import documents_schema, generics_schema, files_schema, prompts_schema, selections_schema
from backend.api.enums import FileType, CommitState


def get(db: Session, document_id: UUID) -> documents_schema.Document:
    document = support_crud.apply_or_404(
        documents_crud.read, 
        db=db, 
        id=document_id, 
        join_with=["files", "prompts", "selections"]
    )
    return documents_schema.Document.model_validate(document)


def get_shallow(db: Session, document_id: UUID) -> documents_schema.DocumentShallow:
    items = get_shallow_list(db=db, skip=0, limit=1, id=document_id)
    if not items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {str(document_id)!r} not found",
        )
    return items[0]


def get_list(db: Session, skip: int, limit: int) -> list[documents_schema.Document]:
    documents = documents_crud.search(
        db=db,
        skip=skip,
        limit=limit,
        join_with=["files", "prompts", "selections"]
    )
    return [ documents_schema.Document.model_validate(i) for i in documents ]


def get_shallow_list(db: Session, skip: int, limit: int, **filters) -> list[documents_schema.DocumentShallow]:
    records = documents_crud.search_shallow(
        db=db,
        skip=skip,
        limit=limit,
        order_by=[("name", "asc"), ("created_at", "desc")],
        **filters,
    )

    return support_crud.build_shallow_list(
        records,
        schema_cls=documents_schema.DocumentShallow,
        transforms={
            "prompt_count": lambda ctx: int(ctx["record"][1] or 0),
            "selection_count": lambda ctx: int(ctx["record"][2] or 0),
            "is_processed": lambda ctx: bool(ctx["record"][3]),
        },
    )

def search_list(db: Session, skip: int, limit: int, name: str | None, project_id: UUID | None) -> list[documents_schema.Document]:
    documents = documents_crud.search(
        db=db,
        skip=skip,
        limit=limit,
        order_by=[("name", "asc"), ("created_at", "desc")],
        join_with=["files", "prompts", "selections"],
        project_id=project_id,
        **({"name": ("like", name.replace("*", "%"))} if name is not None else {})  # dismiss name field filter if name is None, else, replace wildcard
    )
    return [ documents_schema.Document.model_validate(i) for i in documents ]


def create(db: Session, document_data: documents_schema.DocumentCreate) -> documents_schema.Document:
    document = documents_crud.create(db=db, data=document_data)
    return documents_schema.Document.model_validate(document)


def create_with_file(db: Session, upload_data: files_schema.FileUpload, password: str) -> documents_schema.Document:
    # Verify project password first
    support_crud.verify_project_password_or_401(db=db, project_id=upload_data.project_id, password=password)
    
    # Use the existing processing logic
    result = support_crud.process_upload(db=db, project_id=upload_data.project_id, upload_data=upload_data, password=password)
    
    # Handle processing errors
    if isinstance(result, tuple):
        filename, error_msg = result
        if "File too large" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large; maximum size: {security_manager.settings.processing.max_file_size / (1024*1024):.1f} MB"
            )
        elif "Invalid PDF" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid PDF file; only PDF files are allowed"
            )
        elif "Filename already exists" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A document with filename '{filename}' already exists in this project"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload document: {error_msg}"
            )
    
    # Use bulk creation for consistency and transaction safety
    try:
        created_documents = support_crud.bulk_create_documents_with_files_and_init(db=db, bulk_data=[result])
        # Return the single created document with joined data
        document = support_crud.apply_or_404(
            documents_crud.read, 
            db=db, 
            id=created_documents[0].id, 
            join_with=["files", "prompts", "selections"]
        )
        return documents_schema.Document.model_validate(document)
    
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document: {str(err)}"
        )


def bulk_create_with_files(db: Session, uploads_data: list[files_schema.FileUpload], password: str, template_description: str | None = None) -> generics_schema.Success:
    # Validate inputs and password
    if not uploads_data:
        return generics_schema.Success(
            message="No files provided for upload",
            detail={
                "successful_uploads": [],
                "failed_uploads": [],
                "total_files": 0,
                "success_count": 0,
                "error_count": 0
            }
        )
    
    project_id = uploads_data[0].project_id
    support_crud.verify_project_password_or_401(db=db, project_id=project_id, password=password)
    
    if any(upload.project_id != project_id for upload in uploads_data):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="All files must belong to the same project")

    # Run processing logic and filter out failed results
    results = [support_crud.process_upload(db=db, project_id=project_id, upload_data=x, password=password) for x in uploads_data]
    successes = [ data for data in results if isinstance(data, documents_schema.DocumentBulkUpload) ]
    errors = [ error for error in results if isinstance(error, tuple) ]
    
    # Apply template description to successful results if provided
    if template_description:
        for success in successes:
            formatted_description = f"[bulk upload] {template_description}"
            success.document_data.description = formatted_description

    # Perform bulk creation
    try:
        created_documents = documents_crud.bulk_create_with_files(db=db, bulk_data=successes)
        successful_uploads = [{
            "filename": doc.name,
            "document_id": str(doc.id),
            "file_id": str(doc.files[0].id),
            "status": "success"
        } for doc in created_documents]

    except Exception as bulk_err:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Bulk creation failed: {str(bulk_err)}")

    # Create error details for the failed uploads
    failed_uploads = [{
        "filename": name,
        "error": err,
        "status": "failed"
    } for name, err in errors]

    return generics_schema.Success(
        message=f"Bulk upload completed: {len(successful_uploads)} successful, {len(failed_uploads)} failed",
        detail={
            "successful_uploads": successful_uploads,
            "failed_uploads": failed_uploads,
            "total_files": len(uploads_data),
            "success_count": len(successful_uploads),
            "error_count": len(failed_uploads)
        }
    )


def get_prompts(db: Session, document_id: UUID, skip: int = 0, limit: int = 100) -> list[prompts_schema.Prompt]:
    # Verify document exists
    support_crud.apply_or_404(documents_crud.read, db=db, id=document_id)
    
    # Get prompts by document ID
    prompts = prompts_crud.read_list_by_document(db=db, document_id=document_id, skip=skip, limit=limit)
    return [prompts_schema.Prompt.model_validate(prompt) for prompt in prompts]


def add_prompt(db: Session, document_id: UUID, prompt_data: prompts_schema.PromptCreate) -> prompts_schema.Prompt:
    # Verify document exists
    support_crud.apply_or_404(documents_crud.read, db=db, id=document_id)
    
    # Set document_id and create prompt
    prompt_data.document_id = document_id
    prompt = prompts_crud.create(db=db, data=prompt_data)
    return prompts_schema.Prompt.model_validate(prompt)


def get_selections(db: Session, document_id: UUID, skip: int = 0, limit: int = 100) -> list[selections_schema.Selection]:
    # Verify document exists
    support_crud.apply_or_404(documents_crud.read, db=db, id=document_id)
    
    # Get selections by document ID
    selections = selections_crud.read_list_by_document(db=db, document_id=document_id, skip=skip, limit=limit)
    return [selections_schema.Selection.model_validate(selection) for selection in selections]


def add_selection(db: Session, document_id: UUID, selection_data: selections_schema.SelectionCreate) -> selections_schema.Selection:
    # Verify document exists
    support_crud.apply_or_404(documents_crud.read, db=db, id=document_id)
    
    # Set document_id and create selection
    selection_data.document_id = document_id
    selection = selections_crud.create(db=db, data=selection_data)
    return selections_schema.Selection.model_validate(selection)


def clear_staged_selections(db: Session, document_id: UUID, request: selections_schema.SelectionClearRequest) -> generics_schema.Success:
    _ = support_crud.apply_or_404(documents_crud.read, db=db, id=document_id)
    deleted_count = support_crud.clear_staged_selections(
        db=db,
        document_id=document_id,
        selection_ids=list(request.selection_ids or []),
        clear_all=bool(request.clear_all),
    )
    return generics_schema.Success(message=("Cleared all staged selections" if request.clear_all else "Cleared selected staged selections"), detail={"deleted_count": int(deleted_count)})


def uncommit_selections(db: Session, document_id: UUID, request: selections_schema.SelectionUncommitRequest) -> list[selections_schema.Selection]:
    _ = support_crud.apply_or_404(documents_crud.read, db=db, id=document_id)
    staged = support_crud.uncommit_selections(
        db=db,
        document_id=document_id,
        selection_ids=list(request.selection_ids or []),
        uncommit_all=bool(request.uncommit_all),
    )
    return [selections_schema.Selection.model_validate(i) for i in staged]


def commit_staged_selections(db: Session, document_id: UUID, request: selections_schema.SelectionCommitRequest) -> list[selections_schema.Selection]:
    _ = support_crud.apply_or_404(documents_crud.read, db=db, id=document_id)
    committed = support_crud.commit_staged_selections(
        db=db,
        document_id=document_id,
        selection_ids=list(request.selection_ids or []),
        commit_all=bool(request.commit_all),
    )
    return [selections_schema.Selection.model_validate(i) for i in committed]


def apply_ai_and_stage(db: Session, document_id: UUID) -> documents_schema.AiApplyResponse:
    # Ensure document exists and load prompts/settings
    document = support_crud.apply_or_404(
        documents_crud.read,
        db=db,
        id=document_id,
        join_with=["prompts", "project.ai_settings"],
    )

    committed_prompts = [p for p in document.prompts if getattr(p, "state", None) == CommitState.COMMITTED]

    # Filter by minimum confidence threshold from defaults
    from backend.core import defaults as core_defaults
    min_conf = float(getattr(core_defaults, 'AI_MIN_CONFIDENCE', 0.0))

    if not committed_prompts:
        # No prompts to run AI with; return empty response and telemetry
        return documents_schema.AiApplyResponse(
            selections=[],
            telemetry=documents_schema.AiApplyTelemetry(
                min_confidence=float(min_conf),
                returned=0,
                filtered_out=0,
                staged=0,
            ),
        )

    composed_prompts: list[str] = []
    for p in committed_prompts:
        composed_prompts.append(f"Directive: {p.directive}\nTitle: {p.title}\n\nInstructions:\n{p.prompt}")

    from backend.service.ai_service import get_ai_service, GenerateSelectionsRequest
    import asyncio

    async def _run():
        svc = get_ai_service()
        req = GenerateSelectionsRequest(
            document_id=str(document_id),
            system_prompt=(document.project.ai_settings.system_prompt if getattr(document, "project", None) and getattr(document.project, "ai_settings", None) else None),
            prompts=composed_prompts,
        )
        return await svc.generate_selections(req)

    res = asyncio.run(_run())

    filtered = [s for s in res.selections if (float(s.confidence) if s.confidence is not None else 0.0) >= min_conf]

    created_models = []
    for sel in filtered:
        sel.document_id = document_id
        sel.state = CommitState.STAGED_CREATION
        created_models.append(selections_crud.create(db=db, data=sel))

    selections_out = [selections_schema.Selection.model_validate(i) for i in created_models]
    telemetry = {
        "min_confidence": float(min_conf),
        "returned": int(len(res.selections)),
        "filtered_out": int(len(res.selections) - len(filtered)),
        "staged": int(len(created_models)),
    }
    return documents_schema.AiApplyResponse(selections=selections_out, telemetry=documents_schema.AiApplyTelemetry(**telemetry))


def update(db: Session, document_id: UUID, document_data: documents_schema.DocumentUpdate) -> documents_schema.Document:
    document = support_crud.apply_or_404(documents_crud.update, db=db, id=document_id, data=document_data)
    return documents_schema.Document.model_validate(document)


def delete(db: Session, document_id: UUID) -> generics_schema.Success:
    support_crud.apply_or_404(documents_crud.delete, db=db, id=document_id)
    return generics_schema.Success(message=f"Document with ID {str(document_id)!r} deleted successfully")


def summarize(db: Session, document_id: UUID) -> documents_schema.DocumentSummary:
    document = support_crud.apply_or_404(
        documents_crud.read, 
        db=db, 
        id=document_id, 
        join_with=["files", "prompts", "selections", "project"]
    )

    return support_crud.build_summary(
        schema_cls=documents_schema.DocumentSummary,
        model=document,
        transforms={
            "document_id": lambda ctx: ctx["model"].id,
            "project_name": lambda ctx: ctx["model"].project.name,
            "has_original_file": lambda ctx: ctx["model"].original_file is not None,
            "has_redacted_file": lambda ctx: ctx["model"].redacted_file is not None,
            "original_file_size": lambda ctx: (ctx["model"].original_file.file_size if ctx["model"].original_file else None),
            "redacted_file_size": lambda ctx: (ctx["model"].redacted_file.file_size if ctx["model"].redacted_file else None),
            "total_file_size": lambda ctx: ((ctx["model"].original_file.file_size if ctx["model"].original_file else 0) + (ctx["model"].redacted_file.file_size if ctx["model"].redacted_file else 0)),
            "prompt_count": lambda ctx: len(ctx["model"].prompts),
            "selection_count": lambda ctx: len(ctx["model"].selections),
            "is_processed": lambda ctx: (ctx["model"].redacted_file is not None),
            "is_template": lambda ctx: bool(getattr(ctx["model"], "template", None)),
            "ai_selections_count": lambda ctx: sum(1 for s in ctx["model"].selections if s.is_ai_generated),
            "manual_selections_count": lambda ctx: sum(1 for s in ctx["model"].selections if not s.is_ai_generated),
            "prompt_languages": lambda ctx: [],
        },
    )


def process(
    db: Session,
    document_id: UUID,
    request: files_schema.EncryptedFileDownloadRequest,
) -> generics_schema.Success:
    # Load document with files and selections (404 if missing)
    document = support_crud.apply_or_404(
        documents_crud.read,
        db=db,
        id=document_id,
        join_with=["files", "selections"],
    )

    # Check committed selections first (fail fast before any heavy work)
    committed_selections = [s for s in document.selections if getattr(s, "state", None) == CommitState.COMMITTED]
    if not committed_selections:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document has no committed selections - cannot process"
        )

    # Obtain decrypted original file data in one step (401/404/500 handled inside)
    _, original_file, decrypted_data = support_crud.get_original_file_data_or_400_401_404_500(
        db=db,
        document_or_id=document,
        encrypted_password_b64=request.encrypted_password,
        key_id=request.key_id,
        join_with=["files"],
    )

    # If a redacted file already exists, delete it to allow reprocessing (replace semantics)
    redacted_file = getattr(document, "redacted_file", None) or next(
        (f for f in document.files if f.file_type == FileType.REDACTED), None
    )
    if redacted_file is not None:
        # Use unified not-found semantics for delete
        support_crud.apply_or_404(files_crud.delete, db=db, id=redacted_file.id)
        # Expire the 'files' relationship cache to avoid stale references
        db.expire(document, ["files"])  # mark relationship for reload on next access

    # Apply redaction
    try:
        redacted_pdf_data = get_redactor_service().redact(
            pdf_data=decrypted_data,
            selections=[ AreaSelection.model_validate(i) for i in committed_selections ]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Redaction failed: {str(e)}"
        )

    # Save redacted file
    redacted_file_hash = security_manager.generate_file_hash(redacted_pdf_data)
    file_data = files_schema.FileCreate(
        file_hash=redacted_file_hash,
        file_type=FileType.REDACTED,
        mime_type=original_file.mime_type,
        data=redacted_pdf_data,
        document_id=document_id,
    )

    try:
        redacted_file = files_crud.create(db=db, data=file_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save redacted file: {str(e)}"
        )
    
    return generics_schema.Success(
        message="Document processed successfully - redacted file created",
        detail={
            "document_id": str(document_id),
            "redacted_file_id": str(redacted_file.id),
            "original_file_size": original_file.file_size,
            "redacted_file_size": len(redacted_pdf_data),
            "selections_count": len(document.selections)
        }
    )


def download_original_file(
    db: Session, 
    document_id: UUID, 
    request: files_schema.EncryptedFileDownloadRequest
) -> StreamingResponse:
    # Centralized retrieval + decryption of original file data
    document, original_file, decrypted_data = support_crud.get_original_file_data_or_400_401_404_500(
        db=db,
        document_or_id=document_id,
        encrypted_password_b64=request.encrypted_password,
        key_id=request.key_id,
        join_with=["files"],
    )

    # Generate filename
    safe_filename = f"{document.name}_original.pdf"

    # Determine headers based on stream parameter
    if request.stream:
        headers = {
            "Content-Disposition": "inline",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    else:
        headers = {
            "Content-Disposition": f'attachment; filename="{safe_filename}"'
        }

    return StreamingResponse(
        io.BytesIO(decrypted_data),
        media_type=original_file.mime_type,
        headers=headers
    )


def download_redacted_file(
    db: Session, 
    document_id: UUID
) -> StreamingResponse:
    # Use helpers to fetch document and validated redacted file data
    document, redacted_file, file_data = support_crud.get_redacted_file_data_or_404_500(db=db, document_id=document_id, join_with=["files"])

    # Generate filename: use document ID to avoid leaking names
    safe_filename = f"{document.id}.pdf"

    # Always download as attachment for redacted files and disable caching
    headers = {
        "Content-Disposition": f'attachment; filename=\"{safe_filename}\"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
    }

    return StreamingResponse(
        io.BytesIO(file_data),
        media_type=redacted_file.mime_type,
        headers=headers
    )
