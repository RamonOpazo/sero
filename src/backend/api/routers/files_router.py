from uuid import UUID
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.core.database import get_db_session
from backend.api.schemas import files_schema, selections_schema, prompts_schema, generics_schema
from backend.api.controllers import files_controller


router = APIRouter()


@router.get("", response_model=list[files_schema.File])
async def list_files(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session)
):
    return files_controller.get_list(db=db, skip=skip, limit=limit)


@router.post("", response_model=files_schema.File)
async def create_file(
    file_data: files_schema.FileCreate,
    db: Session = Depends(get_db_session)
):
    return files_controller.create(db=db, file_data=file_data)


@router.get("/search", response_model=list[files_schema.File])
async def search_files(
    skip: int = 0,
    limit: int = 100,
    project_id: UUID | None = None,
    document_id: UUID | None = None,
    filename: str | None = None,
    exclude_original_files: bool = False,
    exclude_obfuscated_files: bool = False,
    db: Session = Depends(get_db_session)
):
    return files_controller.search_list(
        db=db,
        skip=skip,
        limit=limit,
        project_id=project_id,
        document_id=document_id,
        filename=filename,
        exclude_original_files=exclude_original_files,
        exclude_obfuscated_files=exclude_obfuscated_files,
    )


@router.get("/id/{file_id}/summary", response_model=files_schema.File)
async def summarize_file(
    file_id: UUID,
    db: Session = Depends(get_db_session)
):
    return files_controller.summarize(db=db, file_id=file_id)


@router.get("/id/{file_id}/download", response_class=StreamingResponse)
async def download_file(
    file_id: UUID,
    password: str,
    stream: bool = False,
    db: Session = Depends(get_db_session)
) -> StreamingResponse:
    return files_controller.download(db=db, file_id=file_id, password=password, stream=stream)


@router.get("/id/{file_id}/prompts", response_model=list[prompts_schema.Prompt])
async def get_prompts(
    file_id: UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session)
):
    return files_controller.list_prompts(db=db, file_id=file_id, skip=skip, limit=limit)


@router.put("/id/{file_id}/prompts", response_model=list[prompts_schema.Prompt])
async def add_prompts(
    file_id: UUID,
    prompts_data: list[prompts_schema.PromptCreate],
    db: Session = Depends(get_db_session)
):
    return files_controller.update_prompts(db=db, file_id=file_id, prompts_data=prompts_data)


@router.get("/id/{file_id}/selections", response_model=list[selections_schema.Selection])
async def get_selections(
    file_id: UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session)
):
    return files_controller.list_selections(db=db, file_id=file_id, skip=skip, limit=limit)


@router.put("/id/{file_id}/selections", response_model=list[selections_schema.Selection])
async def add_selections(
    file_id: UUID,
    selections_data: list[selections_schema.SelectionCreate],
    db: Session = Depends(get_db_session)
):
    return files_controller.update_selections(db=db, file_id=file_id, selections_data=selections_data)


@router.get("/id/{file_id}", response_model=files_schema.File)
async def get_file(
    file_id: UUID,
    db: Session = Depends(get_db_session)
):
    return files_controller.get(db=db, file_id=file_id)


@router.delete("/id/{file_id}", response_model=generics_schema.Success)
async def delete_file(
    file_id: UUID,
    db: Session = Depends(get_db_session)
):
    return files_controller.delete(db=db, file_id=file_id)
