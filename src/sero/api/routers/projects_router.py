from uuid import UUID
from fastapi import APIRouter, Depends, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from sero.core.database import get_db_session
from sero.api.schemas import projects_schema, files_schema, generics_schema
from sero.api.controllers import projects_controller


router = APIRouter()


@router.get("/", response_model=list[projects_schema.Project])
async def list_projects(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session)
):
    return projects_controller.get_list(db=db, skip=skip, limit=limit)


@router.get("/search", response_model=list[projects_schema.Project])
async def search_projects(
    skip: int = 0,
    limit: int = 100,
    name: str | None = None,
    version: int = None,
    db: Session = Depends(get_db_session)
):
    return projects_controller.search_list(db=db, skip=skip, limit=limit, name=name, version=version)


@router.post("/", response_model=projects_schema.Project, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: projects_schema.ProjectCreate,
    db: Session = Depends(get_db_session)
):
    return projects_controller.create(db=db, project_data=project_data)


@router.get("/id/{project_id}/summary", response_model=generics_schema.Success)
async def summarize_project(
    project_id: UUID,
    db: Session = Depends(get_db_session)
):
    return projects_controller.summarize(db=db, project_id=project_id)


@router.post("/id/{project_id}/upload-files", response_model=generics_schema.Success, status_code=status.HTTP_201_CREATED)
async def bulk_upload_files(
    project_id: UUID,
    files: list[UploadFile] = File(...),
    description_template: str | None = Form(None),
    password: str = Form(...),
    db: Session = Depends(get_db_session)
):
    uploads_data = [
        files_schema.FileUpload(
            project_id=project_id,
            file=file,
            description=description_template
        )
        for file in files
    ]
    return projects_controller.bulk_upload_files(db=db, uploads_data=uploads_data, password=password)


@router.get("/id/{project_id}", response_model=projects_schema.Project)
async def get_project(
    project_id: UUID,
    db: Session = Depends(get_db_session)
):
    return projects_controller.get(db=db, project_id=project_id)


@router.put("/id/{project_id}", response_model=projects_schema.Project)
async def update_project(
    project_id: UUID,
    project_data: projects_schema.ProjectUpdate,
    db: Session = Depends(get_db_session)
):
    return projects_controller.update(db=db, project_id=project_id, project_data=project_data)


@router.delete("/id/{project_id}", response_model=generics_schema.Success)
async def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db_session)
):
    return projects_controller.delete(db=db, project_id=project_id)
