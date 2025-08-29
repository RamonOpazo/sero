from uuid import UUID
from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from loguru import logger

from backend.crud import projects_crud, support_crud, ai_settings_crud, documents_crud, templates_crud, files_crud
from backend.api.schemas import projects_schema, generics_schema, settings_schema, templates_schema, files_schema
from backend.api.enums import ProjectStatus
from backend.core.security import security_manager
from backend.api.enums import FileType
from backend.service.redactor_service import get_redactor_service
from backend.core.pdf_redactor import AreaSelection


def get_ai_settings(db: Session, project_id: UUID) -> settings_schema.AiSettings:
    project = support_crud.apply_or_404(projects_crud.read, db=db, id=project_id, join_with=["ai_settings"])
    if getattr(project, "ai_settings", None) is None:
        from backend.core.config import settings as app_settings
        created = ai_settings_crud.create_default_for_project(db=db, project_id=project_id, defaults={
            "provider": getattr(getattr(app_settings, "ai", object()), "provider", "ollama"),
            "model_name": app_settings.ai.model,
            "temperature": 0.2,
        })
        return settings_schema.AiSettings.model_validate(created)
    return settings_schema.AiSettings.model_validate(project.ai_settings)


def update_ai_settings(db: Session, project_id: UUID, data: settings_schema.AiSettingsUpdate) -> settings_schema.AiSettings:
    # Ensure project exists
    _ = support_crud.apply_or_404(projects_crud.read, db=db, id=project_id)
    updated = ai_settings_crud.update_by_project(db=db, project_id=project_id, data=data)
    return settings_schema.AiSettings.model_validate(updated)


def get(db: Session, project_id: UUID) -> projects_schema.Project:
    project = support_crud.apply_or_404(
        projects_crud.read,
        db=db,
        id=project_id,
        join_with=["documents", "ai_settings", "watermark_settings", "annotation_settings"]
    )
    return projects_schema.Project.model_validate(project)


def get_list(db: Session, skip: int, limit: int) -> list[projects_schema.Project]:
    projects = projects_crud.search(
        db=db,
        skip=skip,
        limit=limit,
        order_by=[("name", "asc")],
        join_with=["documents"]
    )
    return [ projects_schema.Project.model_validate(i) for i in projects ]


def get_shallow_list(db: Session, skip: int, limit: int, **filters) -> list[projects_schema.ProjectShallow]:
    records = projects_crud.search_shallow(
        db=db,
        skip=skip,
        limit=limit,
        order_by=[("name", "asc")],
        **filters,
    )

    return support_crud.build_shallow_list(
        records,
        schema_cls=projects_schema.ProjectShallow,
        transforms={
            "document_count": lambda ctx: int(ctx["record"][1] or 0),
            "has_documents": lambda ctx: (int(ctx["record"][1] or 0) > 0),
        },
    )


def search_list(db: Session, skip: int, limit: int, name: str | None) -> list[projects_schema.Project]:
    projects = projects_crud.search(
        db=db,
        skip=skip,
        limit=limit,
        order_by=[("name", "asc")],
        join_with=["documents"],
        **({"name": ("like", name.replace("*", "%"))} if name is not None else {})  # dismiss name field filter if name is None, else, replace wildcard
    )
    return [ projects_schema.Project.model_validate(i) for i in projects ]


def create(db: Session, project_data: projects_schema.ProjectCreate) -> projects_schema.Project:
    if projects_crud.exist_with_name(db=db, name=project_data.name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project with name {project_data.name!r} already exists"
        )
    
    project = projects_crud.create(db=db, data=project_data)
    return projects_schema.Project.model_validate(project)


def update(db: Session, project_id: UUID, project_data: projects_schema.ProjectUpdate) -> projects_schema.Project:    
    if project_data.name and projects_crud.exist_with_name(db=db, name=project_data.name, exclude_id=project_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project with name {project_data.name!r} already exists"
        )
       
    project = support_crud.apply_or_404(projects_crud.update, db=db, id=project_id, data=project_data)
    return get(db=db, project_id=project.id)


def delete(db: Session, project_id: UUID) -> generics_schema.Success:
    project = support_crud.apply_or_404(projects_crud.delete, db=db, id=project_id)
    return generics_schema.Success(message=f"Project {project.name!r} deleted successfully")


def summarize(db: Session, project_id: UUID) -> projects_schema.ProjectSummary:
    project = support_crud.apply_or_404(
        projects_crud.read,
        db=db,
        id=project_id,
        join_with=[ "documents.files", "documents.prompts", "documents.selections", "ai_settings", "watermark_settings", "annotation_settings" ]
    )

    def doc_iter(ctx):
        return ctx["model"].documents or []

    return support_crud.build_summary(
        schema_cls=projects_schema.ProjectSummary,
        model=project,
        transforms={
            "project_id": lambda ctx: ctx["model"].id,
            "status": lambda ctx: (
                ProjectStatus.AWAITING if len(doc_iter(ctx)) == 0 else (
                    ProjectStatus.COMPLETED if sum(1 for d in doc_iter(ctx) if d.redacted_file is not None) == len(doc_iter(ctx)) else ProjectStatus.IN_PROGRESS
                )
            ),
            "has_template": lambda ctx: bool(getattr(ctx["model"], "template", None)),
            "document_count": lambda ctx: len(doc_iter(ctx)),
            "documents_with_original_files": lambda ctx: sum(1 for d in doc_iter(ctx) if d.original_file is not None),
            "documents_with_redacted_files": lambda ctx: sum(1 for d in doc_iter(ctx) if d.redacted_file is not None),
            "processed_documents_count": lambda ctx: sum(1 for d in doc_iter(ctx) if d.redacted_file is not None),
            "total_original_files_size": lambda ctx: sum((d.original_file.file_size for d in doc_iter(ctx) if d.original_file), 0),
            "total_redacted_files_size": lambda ctx: sum((d.redacted_file.file_size for d in doc_iter(ctx) if d.redacted_file), 0),
            "total_files_size": lambda ctx: (
                sum((d.original_file.file_size for d in doc_iter(ctx) if d.original_file), 0)
                + sum((d.redacted_file.file_size for d in doc_iter(ctx) if d.redacted_file), 0)
            ),
            "total_prompts": lambda ctx: sum(len(d.prompts) for d in doc_iter(ctx)),
            "total_selections": lambda ctx: sum(len(d.selections) for d in doc_iter(ctx)),
            "total_ai_selections": lambda ctx: sum(1 for d in doc_iter(ctx) for s in d.selections if s.is_ai_generated),
            "total_manual_selections": lambda ctx: sum(1 for d in doc_iter(ctx) for s in d.selections if not s.is_ai_generated),
            "oldest_document_date": lambda ctx: (min((d.created_at for d in doc_iter(ctx)), default=None)),
            "newest_document_date": lambda ctx: (max((d.created_at for d in doc_iter(ctx)), default=None)),
        },
    )

    
def get_template(db: Session, project_id: UUID) -> templates_schema.Template:
    tpl = templates_crud.read_by_project(db=db, project_id=project_id)
    if tpl is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No project-scoped document set for this project")
    return templates_schema.Template.model_validate(tpl)


def set_template(db: Session, project_id: UUID, data: templates_schema.TemplateUpdate) -> templates_schema.Template:
    # Ensure project and document exist and are related correctly
    _ = support_crud.apply_or_404(projects_crud.read, db=db, id=project_id)
    if data.document_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="document_id is required")
    doc = support_crud.apply_or_404(documents_crud.read, db=db, id=data.document_id)
    if doc.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document does not belong to this project")
    updated = templates_crud.update_by_project(db=db, project_id=project_id, data=data)
    return templates_schema.Template.model_validate(updated)


def clear_template(db: Session, project_id: UUID) -> generics_schema.Success:
    _ = support_crud.apply_or_404(projects_crud.read, db=db, id=project_id)
    deleted = templates_crud.delete_by_project(db=db, project_id=project_id)
    if deleted is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No project-scoped document to clear")
    return generics_schema.Success(message="Cleared project-scoped document", detail={"project_id": str(project_id)})


async def redact_stream(
    db: Session,
    project_id: UUID,
    request: projects_schema.ProjectRedactionRequest,
) -> StreamingResponse:
    """SSE streaming redaction for a project's documents with required scope filtering.

    Events:
    - project_init: { total_documents }
    - project_doc_start: { index, document_id }
    - status: { stage, document_id?, message? }
    - project_doc_summary: { document_id, ok, reason?, redacted_file_id?, original_file_size?, redacted_file_size?, selections_applied }
    - project_progress: { processed, total }
    - completed: { ok }
    - error: { message }
    """

    def _to_area(sel) -> AreaSelection:
        return AreaSelection(
            x=float(sel.x),
            y=float(sel.y),
            width=float(sel.width),
            height=float(sel.height),
            page_number=(int(sel.page_number) if sel.page_number is not None else None),
        )
    
    async def _sse_gen():
        try:
            # Verify project exists
            support_crud.apply_or_404(projects_crud.read, db=db, id=project_id)

            # Collect documents for project with needed relationships
            docs = support_crud.apply_or_404(
                documents_crud.search,
                db=db,
                skip=0,
                limit=10_000,
                project_id=project_id,
                join_with=["files", "selections"],
                order_by=[("created_at", "asc")],
            )

            total_docs = len(docs)
            yield projects_schema.ProjectInitEvent(total_documents=total_docs).res
        
        except Exception as err:
            logger.exception("redact_stream failed")
            yield projects_schema.ErrorEvent(message=str(err)).res
            return

        processed = 0

        for idx, doc in enumerate(docs, start=1):
            did = str(doc.id)
            yield projects_schema.ProjectDocStartEvent(index=idx, document_id=did).res

            try:
                selections_to_apply = list(support_crud.get_selections_to_apply_or_404(db=db, project_id=project_id, scope=request.scope, selections=doc.selections))
            except HTTPException:
                yield projects_schema.ProjectDocSummaryEvent(document_id=did, ok=False, reason="no_committed_selections_for_scope", selections_applied=0).res
                processed += 1
                yield projects_schema.ProjectProgressEvent(processed=processed, total=total_docs).res
                continue

            # Decrypt original
            try:
                yield projects_schema.StatusEvent(stage="decrypting", document_id=did).res
                _, original_file, decrypted = support_crud.get_original_file_data_or_400_401_404_500(
                    db=db,
                    document_or_id=doc,
                    encrypted_password_b64=request.encrypted_password,
                    key_id=request.key_id,
                    join_with=["files"],
                )
            except HTTPException as err:
                yield projects_schema.ProjectDocSummaryEvent(document_id=did, ok=False, reason=f"decrypt_failed: {err}", selections_applied=0).res
                processed += 1
                yield projects_schema.ProjectProgressEvent(processed=processed, total=total_docs).res
                continue

            # Run redaction
            try:
                yield projects_schema.StatusEvent(stage="redacting", document_id=did).res
                redacted_bytes = get_redactor_service().redact(
                    pdf_data=decrypted,
                    selections=[_to_area(s) for s in selections_to_apply],
                )
            except Exception as err:
                logger.exception("redaction failed")
                yield projects_schema.ProjectDocSummaryEvent(document_id=did, ok=False, reason=f"redaction_failed: {err}", selections_applied=len(selections_to_apply)).res
                processed += 1
                yield projects_schema.ProjectProgressEvent(processed=processed, total=total_docs).res
                continue

            # Replace existing redacted file if present
            try:
                yield projects_schema.StatusEvent(stage="saving", document_id=did).res
                # Delete existing redacted file if any
                existing_red = next((f for f in (doc.files or []) if f.file_type == FileType.REDACTED), None)
                if existing_red is not None:
                    support_crud.apply_or_404(files_crud.delete, db=db, id=existing_red.id)
                    db.expire(doc, ["files"])  # ensure relationship reloads

                # Create new redacted file
                red_hash = security_manager.generate_file_hash(redacted_bytes)
                file_data = files_schema.FileCreate(
                    file_hash=red_hash,
                    file_type=FileType.REDACTED,
                    mime_type=original_file.mime_type,
                    data=redacted_bytes,
                    document_id=doc.id,
                )
                created = files_crud.create(db=db, data=file_data)

                yield projects_schema.ProjectDocSummaryEvent(
                    document_id=did,
                    ok=True,
                    redacted_file_id=str(created.id),
                    original_file_size=original_file.file_size,
                    redacted_file_size=len(redacted_bytes),
                    selections_applied=len(selections_to_apply),
                ).res
            except Exception as err:
                logger.exception("saving redacted file failed")
                yield projects_schema.ProjectDocSummaryEvent(document_id=did, ok=False, reason=f"save_failed: {err}", selections_applied=len(selections_to_apply)).res

            processed += 1
            yield projects_schema.ProjectProgressEvent(processed=processed, total=total_docs).res

        yield projects_schema.CompletedEvent(ok=True).res

    return StreamingResponse(_sse_gen(), media_type="text/event-stream")
