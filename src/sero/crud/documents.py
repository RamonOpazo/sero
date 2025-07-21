from uuid import UUID
from sqlalchemy.orm import Session, joinedload

from sero.db.models import Document
from sero.api.schemas import documents_schema
from sero.crud.base import BaseCrud
from sero.api.enums import DocumentStatus


class DocumentCrud(BaseCrud[Document, documents_schema.DocumentCreate, documents_schema.DocumentUpdate]):
    def read_with_backrefs(self, db: Session, document_id: UUID) -> Document | None:
        document = (
            db.query(Document)
            .filter(Document.id == document_id)
            .options(joinedload(Document.files))
            .first()
        )
        return document


    def search_list(self, db: Session, skip: int, limit: int, status: DocumentStatus | None, project_id: UUID | None) -> list[Document]:
        documents = (
            db.query(Document)
            .order_by(Document.created_at.desc())
            .options(joinedload(Document.files))
            .filter(
                Document.status == status if status else True,
                Document.project_id == project_id if project_id else True
            )
            .offset(skip)
            .limit(limit)
            .all()
        )
        return documents
