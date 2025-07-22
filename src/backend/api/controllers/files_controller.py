import io
from uuid import UUID
from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.core.security import security_manager
from backend.crud import files_crud, prompts_crud, selections_crud, projects_crud, documents_crud
from backend.api.schemas import files_schema, prompts_schema, selections_schema, generics_schema
from backend.api.controllers.documents_controller import update_status
from backend.api.enums import DocumentStatus


def get(db: Session, file_id: UUID) -> files_schema.File:
    file = files_crud.read(db=db, id=file_id)
    if file is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with ID {file_id!r} not found"
        )
    
    return files_schema.File.model_validate(file)


def get_list(db: Session, skip: int, limit: int) -> list[files_schema.File]:
    files = files_crud.search_list(
        db=db,
        skip=skip,
        limit=limit,
        project_id=None,
        document_id=None,
        filename=None,
        exclude_original_files=False,
        exclude_obfuscated_files=False
    )
    return [ files_schema.File.model_validate(i) for i in files ]


def search_list(
    db: Session,
    skip: int,
    limit: int,
    project_id: UUID | None,
    document_id: UUID | None,
    filename: str | None,
    exclude_original_files: bool = False,
    exclude_obfuscated_files: bool = False,
) -> list[files_schema.File]:
    files = files_crud.search_list(
        db=db,
        skip=skip,
        limit=limit,
        project_id=project_id,
        document_id=document_id,
        filename=filename,    
        exclude_original_files=exclude_original_files,
        exclude_obfuscated_files=exclude_obfuscated_files
    )
    return [ files_schema.File.model_validate(i) for i in files ]


def create(db: Session, file_data: files_schema.FileCreate) -> files_schema.File:
    previous_file = files_crud.search_file_type_in_document(db=db, document_id=file_data.document_id, is_original_file=file_data.is_original_file)
    if previous_file:
        delete(db=db, file_id=previous_file.id)
    file = files_crud.create(db=db, data=file_data)
    update_status(db=db, document_id=file.document_id, status=DocumentStatus.PROCESSED)
    return files_schema.File.model_validate(file)


def delete(db: Session, file_id: UUID) -> generics_schema.Success:
    if not files_crud.exist(db=db, id=file_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with ID {file_id!r} not found"
        )
    
    file = files_crud.delete(db=db, id=file_id)
    return generics_schema.Success(
        message=f"File {file.filename!r} deleted successfully"
    )


def summarize(db: Session, file_id: UUID) -> generics_schema.Success:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)


def download(db: Session, file_id: UUID, password: str) -> StreamingResponse:
    file = get(db=db, file_id=file_id)
    document = documents_crud.read(db=db, id=file.document_id)
    if not projects_crud.verify_password(db=db, id=document.project_id, password=password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid project password"
        )
    
    decrypted_data = security_manager.decrypt_data(encrypted_data=file.data, password=password, salt=file.salt)
    if decrypted_data is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Document is corrupted"
        )
    
    if security_manager.generate_file_hash(decrypted_data) != file.file_hash:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Document integrity verification failed"
        )
    
    return StreamingResponse(
        content=io.BytesIO(decrypted_data),
        media_type="application/pdf",
        headers={ "Content-Disposition": f"attachment; filename={file.filename}" }
    )


def list_selections(db: Session, file_id: UUID, skip: int, limit: int) -> list[selections_schema.Selection]:
    return selections_crud.read_list_by_file(db=db, file_id=file_id, skip=skip, limit=limit)


def update_selections(db: Session, file_id: UUID, selections_data: list[selections_schema.SelectionCreate]) -> list[selections_schema.Selection]:
    selections_crud.delete_by_file(db=db, file_id=file_id)
    return selections_crud.create_in_bulk(db=db, file_id=file_id, selections_data=selections_data)


def list_prompts(db: Session, file_id: UUID, skip: int, limit: int) -> list[prompts_schema.Prompt]:
    return prompts_crud.read_list_by_file(db=db, file_id=file_id, skip=skip, limit=limit)


def update_prompts(db: Session, file_id: UUID, prompts_data: list[prompts_schema.PromptCreate]) -> list[prompts_schema.Prompt]:
    prompts_crud.delete_by_file(db=db, file_id=file_id)
    prompts = prompts_crud.create_in_bulk(db=db, file_id=file_id, prompts_data=prompts_data)
    return [ prompts_schema.Prompt.model_validate(i) for i in prompts ]
