from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.core.database import get_db_session
from backend.api.schemas import projects_schema, generics_schema, settings_schema
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
    """Create a new project."""
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
