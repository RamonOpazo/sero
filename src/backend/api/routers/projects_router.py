from uuid import UUID
from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.core.database import get_db_session
from backend.api.schemas import projects_schema, generics_schema, settings_schema, templates_schema
from backend.api.controllers import projects_controller


router = APIRouter()


@router.get("", response_model=list[projects_schema.Project])
async def list_projects(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session)
):
    """Get paginated list of all projects."""
    return projects_controller.get_list(db=db, skip=skip, limit=limit)


@router.get("/shallow", response_model=list[projects_schema.ProjectShallow])
async def list_projects_shallow(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session)
):
    """Get paginated shallow list of projects without document data for efficient listing."""
    return projects_controller.get_shallow_list(db=db, skip=skip, limit=limit)


@router.get("/search", response_model=list[projects_schema.Project])
async def search_projects(
    skip: int = 0,
    limit: int = 100,
    name: str | None = None,
    db: Session = Depends(get_db_session)
):
    """Search projects with filters."""
    return projects_controller.search_list(db=db, skip=skip, limit=limit, name=name)


@router.post("", response_model=projects_schema.Project, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: projects_schema.ProjectCreate,
    db: Session = Depends(get_db_session)
):
    """Create a new project using encrypted-in-transit password (key_id + encrypted_password)."""
    return projects_controller.create(db=db, project_data=project_data)


@router.get("/id/{project_id}", response_model=projects_schema.Project)
async def get_project(
    project_id: UUID,
    db: Session = Depends(get_db_session)
):
    """Get a single project by ID."""
    return projects_controller.get(db=db, project_id=project_id)


@router.get("/id/{project_id}/ai-settings", response_model=settings_schema.AiSettings)
async def get_project_ai_settings(
    project_id: UUID,
    db: Session = Depends(get_db_session),
):
    """Get AI settings for a project."""
    return projects_controller.get_ai_settings(db=db, project_id=project_id)


@router.put("/id/{project_id}/ai-settings", response_model=settings_schema.AiSettings)
async def update_project_ai_settings(
    project_id: UUID,
    data: settings_schema.AiSettingsUpdate,
    db: Session = Depends(get_db_session),
):
    """Update AI settings for a project."""
    return projects_controller.update_ai_settings(db=db, project_id=project_id, data=data)


@router.put("/id/{project_id}", response_model=projects_schema.Project)
async def update_project(
    project_id: UUID,
    project_data: projects_schema.ProjectUpdate,
    db: Session = Depends(get_db_session)
):
    """Update a project."""
    return projects_controller.update(db=db, project_id=project_id, project_data=project_data)


@router.get("/id/{project_id}/template", response_model=templates_schema.Template)
async def get_project_template(
    project_id: UUID,
    db: Session = Depends(get_db_session),
):
    """Get the project-scoped document mapping (template)."""
    return projects_controller.get_template(db=db, project_id=project_id)


@router.put("/id/{project_id}/template", response_model=templates_schema.Template)
async def set_project_template(
    project_id: UUID,
    data: templates_schema.TemplateUpdate,
    db: Session = Depends(get_db_session),
):
    """Set or replace the project-scoped document (template)."""
    return projects_controller.set_template(db=db, project_id=project_id, data=data)


@router.delete("/id/{project_id}/template", response_model=generics_schema.Success)
async def clear_project_template(
    project_id: UUID,
    db: Session = Depends(get_db_session),
):
    """Clear the project-scoped document mapping (template)."""
    return projects_controller.clear_template(db=db, project_id=project_id)


@router.delete("/id/{project_id}", response_model=generics_schema.Success)
async def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db_session)
):
    """Delete a project."""
    return projects_controller.delete(db=db, project_id=project_id)


@router.get("/id/{project_id}/summary", response_model=projects_schema.ProjectSummary)
async def summarize_project(
    project_id: UUID,
    db: Session = Depends(get_db_session)
):
    """Get comprehensive summary of a project."""
    return projects_controller.summarize(db=db, project_id=project_id)


@router.post("/id/{project_id}/redact/stream")
async def redact_project_stream(
    project_id: UUID,
    payload: projects_schema.ProjectRedactionRequest,
    db: Session = Depends(get_db_session),
) -> StreamingResponse:
    """Stream redaction progress for all documents within a project using SSE.

    The request supplies encrypted credentials; project_id is taken from the path.
    """
    return await projects_controller.redact_stream(db=db, project_id=project_id, request=payload)


@router.get("/id/{project_id}/download/redactions", response_class=StreamingResponse)
async def download_project_redactions(
    project_id: UUID,
    db: Session = Depends(get_db_session),
) -> StreamingResponse:
    """Download a ZIP containing all redacted files for the specified project.
    Password is not required for redacted files.
    """
    return projects_controller.download_project_redactions_zip(db=db, project_id=project_id)
