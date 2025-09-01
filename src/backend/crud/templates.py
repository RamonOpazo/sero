from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from backend.db.models import Template
from backend.api.schemas import templates_schema
from backend.crud.base import BaseCrud


class TemplateCrud(BaseCrud[Template, templates_schema.TemplateCreate, templates_schema.TemplateUpdate]):
    def read_by_project(self, db: Session, project_id: UUID) -> Template | None:
        this = (
            db.query(Template)
            .filter(Template.project_id == project_id)
            .first()
        )
        return this

    def update_by_project(self, db: Session, project_id: UUID, data: templates_schema.TemplateUpdate) -> Template:
        existing = self.read_by_project(db=db, project_id=project_id)
        if existing is None:
            # create
            create_data = templates_schema.TemplateCreate(
                project_id=project_id,
                document_id=data.document_id,  # may raise if None; callers must validate
            )
            return self.create(db=db, data=create_data)
        # update existing mapping
        update_data = data.model_dump(exclude_unset=True)
        update_data.pop("id", None)
        update_data.pop("created_at", None)
        update_data.pop("project_id", None)  # project_id is immutable for a mapping
        update_data["updated_at"] = datetime.now(timezone.utc)
        if update_data.get("document_id") is not None:
            existing.document_id = update_data["document_id"]
        existing.updated_at = update_data["updated_at"]
        db.commit()
        db.refresh(existing)
        return existing

    def delete_by_project(self, db: Session, project_id: UUID) -> Template | None:
        existing = self.read_by_project(db=db, project_id=project_id)
        if existing is None:
            return None
        db.delete(existing)
        db.commit()
        return existing
