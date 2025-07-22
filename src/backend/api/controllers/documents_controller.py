from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.crud import documents_crud
from backend.api.schemas import documents_schema, generics_schema
from backend.api.enums import DocumentStatus


def get(db: Session, document_id: UUID) -> documents_schema.Document:
    document = documents_crud.read_with_backrefs(db=db, document_id=document_id)
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {str(document_id)!r} not found",
        )
    
    return documents_schema.Document.model_validate(document)


def get_list(db: Session, skip: int, limit: int) -> list[documents_schema.Document]:
    documents = documents_crud.search_list(db=db, skip=skip, limit=limit, status=None, project_id=None)
    return [ documents_schema.Document.model_validate(i) for i in documents ]


def search_list(db: Session, skip: int, limit: int, status: DocumentStatus | None, project_id: UUID | None) -> list[documents_schema.Document]:
    documents = documents_crud.search_list(db=db, skip=skip, limit=limit, status=status, project_id=project_id)
    return [ documents_schema.Document.model_validate(i) for i in documents ]


def create(db: Session, document_data: documents_schema.DocumentCreate) -> documents_schema.Document:
    document = documents_crud.create(db=db, data=document_data)
    return documents_schema.Document.model_validate(document)


def update(db: Session, document_id: UUID, document_data: documents_schema.DocumentUpdate) -> documents_schema.Document:
    document = documents_crud.read(db=db, id=document_id)
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {str(document_id)!r} not found",
        )

    updated_document = documents_crud.update(db=db, id=document_id, data=document_data)
    return documents_schema.Document.model_validate(updated_document)


def update_status(db: Session, document_id: UUID, status: DocumentStatus) -> documents_schema.Document:
    document_data = documents_schema.DocumentUpdate(status=status)
    document = update(db=db, document_id=document_id, document_data=document_data)
    return document


def delete(db: Session, document_id: UUID) -> generics_schema.Success:
    if not documents_crud.exist(db=db, id=document_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {str(document_id)!r} not found",
        )

    documents_crud.delete(db, id=document_id)
    return generics_schema.Success(message=f"Document with ID {str(document_id)!r} deleted successfully")


def summarize(db: Session, document_id: UUID) -> generics_schema.Success:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)


def process(db: Session, document_id: UUID) -> generics_schema.Success:
    # TODO: requires document processing cappabilities.
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)
