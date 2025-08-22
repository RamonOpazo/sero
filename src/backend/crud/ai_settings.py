from uuid import UUID
from sqlalchemy.orm import Session
from typing import Any

from backend.db.models import AiSettings
from backend.api.schemas.documents_schema import DocumentAiSettingsUpdate
from backend.crud.base import BaseCrud


class AiSettingsCrud(BaseCrud[AiSettings, DocumentAiSettingsUpdate, DocumentAiSettingsUpdate]):
    def create_default_for_document(self, db: Session, document_id: UUID, defaults: dict[str, Any]) -> AiSettings:
        payload = {
            "document_id": document_id,
            **defaults,
        }
        this = self.model(**payload)
        db.add(this)
        db.commit()
        db.refresh(this)
        return this

    def read_by_document(self, db: Session, document_id: UUID) -> AiSettings | None:
        return (
            db.query(self.model)
            .filter(self.model.document_id == document_id)
            .first()
        )

    def update_by_document(self, db: Session, document_id: UUID, data: DocumentAiSettingsUpdate) -> AiSettings:
        this = self.read_by_document(db=db, document_id=document_id)
        if this is None:
            # Should not happen if we initialize during document create, but handle gracefully
            return self.create_default_for_document(db=db, document_id=document_id, defaults=data.model_dump(exclude_unset=True))
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(this, k, v)
        db.commit()
        db.refresh(this)
        return this

