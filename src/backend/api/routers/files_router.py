from uuid import UUID
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.core.database import get_db_session
from backend.api.schemas import files_schema, generics_schema
from backend.api.controllers import files_controller


router = APIRouter()


@router.get("/id/{file_id}", response_model=files_schema.File)
async def get_file(
    file_id: UUID,
    db: Session = Depends(get_db_session)
):
    """Get a single file by ID."""
    return files_controller.get(db=db, file_id=file_id)


@router.delete("/id/{file_id}", response_model=generics_schema.Success)
async def delete_file(
    file_id: UUID,
    db: Session = Depends(get_db_session)
):
    """Delete a file by ID."""
    return files_controller.delete(db=db, file_id=file_id)


@router.get("/id/{file_id}/download", response_class=StreamingResponse)
async def download_file(
    file_id: UUID,
    password: str,
    stream: bool = False,
    db: Session = Depends(get_db_session)
) -> StreamingResponse:
    """Download a file with decryption and integrity verification.
    
    For original files, uses the document name as filename.
    For non-original files (redacted, etc.), uses the file ID as filename.
    """
    return files_controller.download(db=db, file_id=file_id, password=password, stream=stream)
