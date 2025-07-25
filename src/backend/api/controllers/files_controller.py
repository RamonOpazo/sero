import io
from uuid import UUID
from typing import Callable
from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.core.security import security_manager
from backend.db.models import File as FileModel
from backend.crud import files_crud, projects_crud, documents_crud
from backend.api.schemas import files_schema, generics_schema
from backend.api.enums import FileType


def _raise_not_found(callback: Callable[..., FileModel | None], db: Session, id: UUID, **kwargs) -> FileModel:
    maybe_file = callback(db=db, id=id, **kwargs)
    if maybe_file is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with ID {str(id)!r} not found",
        )
    
    return maybe_file


def get(db: Session, file_id: UUID) -> files_schema.File:
    """Get a single file by ID."""
    file = _raise_not_found(files_crud.read, db=db, id=file_id)
    return files_schema.File.model_validate(file)


def delete(db: Session, file_id: UUID) -> generics_schema.Success:
    """Delete a file by ID."""
    _raise_not_found(files_crud.delete, db=db, id=file_id)
    return generics_schema.Success(message=f"File with ID {str(file_id)!r} deleted successfully")


def download(db: Session, file_id: UUID, password: str, stream: bool) -> StreamingResponse:
    # Get file and verify document exists
    file = get(db=db, file_id=file_id)
    document = documents_crud.read(db=db, id=file.document_id)
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated document not found"
        )
    
    # Verify project password
    if not projects_crud.verify_password(db=db, id=document.project_id, password=password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid project password"
        )
    
    # Decrypt file data (only if encrypted)
    if file.salt is not None:
        decrypted_data = security_manager.decrypt_data(encrypted_data=file.data, password=password, salt=file.salt)
        if decrypted_data is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to decrypt file - document may be corrupted"
            )
    else:
        # File is not encrypted (redacted files)
        decrypted_data = file.data
    
    # Verify file integrity
    if security_manager.generate_file_hash(decrypted_data) != file.file_hash:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="File integrity verification failed - document may be corrupted"
        )
    
    # Generate filename based on file type
    file_extension = ".pdf"  # Default to PDF, could be extracted from mime_type if needed
    match file.file_type:
        case FileType.ORIGINAL:
            safe_filename = f"{document.name}{file_extension}"
        case _:
            safe_filename = f"{file.id}{file_extension}"
    
    # Determine headers based on stream parameter
    if stream:
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
        media_type=file.mime_type,
        headers=headers
    )
