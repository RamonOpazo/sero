from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.core.database import get_db_session
from backend.api.enums import DocumentStatus
from backend.api.schemas import documents_schema, generics_schema
from backend.api.controllers import documents_controller


router = APIRouter()


@router.get("/", response_model=list[documents_schema.Document])
async def list_documents(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session)
):
    return documents_controller.get_list(db=db, skip=skip, limit=limit)


@router.get("/search", response_model=list[documents_schema.Document])
async def search_documents(
    skip: int = 0,
    limit: int = 100,
    status: DocumentStatus | None = None,
    project_id: UUID | None = None,
    db: Session = Depends(get_db_session)
):
    return documents_controller.search_list(db=db, skip=skip, limit=limit, status=status, project_id=project_id)


@router.post("/", response_model=documents_schema.Document)
async def create_document(
    document_data: documents_schema.DocumentCreate,
    db: Session = Depends(get_db_session)
):
    return documents_controller.create(db=db, document_data=document_data)


@router.get("/id/{document_id}/summary", response_model=generics_schema.Success)
async def summarize_document(
    document_id: UUID,
    db: Session = Depends(get_db_session)
):
    return documents_controller.summarize(db=db, document_id=document_id)


@router.post("/id/{document_id}/process", response_model=generics_schema.Success)
async def process_document(
    document_id: UUID,
    db: Session = Depends(get_db_session)
):
    return documents_controller.process(db=db, document_id=document_id)


@router.patch("/id/{document_id}/status", response_model=documents_schema.Document)
async def update_document_status(
    document_id: UUID,
    status: DocumentStatus,
    db: Session = Depends(get_db_session)
):
    return documents_controller.update_status(db=db, document_id=document_id, status=status)


@router.get("/id/{document_id}", response_model=documents_schema.Document)
async def get_document(
    document_id: UUID,
    db: Session = Depends(get_db_session)
):
    return documents_controller.get(db=db, document_id=document_id)


@router.put("/id/{document_id}", response_model=documents_schema.Document)
async def update_document(
    document_id: UUID,
    document_data: documents_schema.DocumentUpdate,
    db: Session = Depends(get_db_session)
):
    return documents_controller.update(db=db, document_id=document_id, document_data=document_data)


@router.delete("/id/{document_id}", response_model=generics_schema.Success)
async def delete_document(
    document_id: UUID,
    db: Session = Depends(get_db_session)
):
    return documents_controller.delete(db=db, document_id=document_id)
