from uuid import UUID
from sqlalchemy.orm import Session
from typing import Any

from src.db.models import AiSettings
from src.api.schemas.settings_schema import AiSettingsCreate, AiSettingsUpdate
from src.crud.base import BaseCrud


class AiSettingsCrud(BaseCrud[AiSettings, AiSettingsCreate, AiSettingsUpdate]):
    def create_default_for_project(self, db: Session, project_id: UUID, defaults: dict[str, Any]) -> AiSettings:
        payload = {
            "project_id": project_id,
            **defaults,
        }
        this = self.model(**payload)
        db.add(this)
        db.commit()
        db.refresh(this)
        return this

    def read_by_project(self, db: Session, project_id: UUID) -> AiSettings | None:
        return (
            db.query(self.model)
            .filter(self.model.project_id == project_id)
            .first()
        )

    def update_by_project(self, db: Session, project_id: UUID, data: AiSettingsUpdate) -> AiSettings:
        this = self.read_by_project(db=db, project_id=project_id)
        if this is None:
            # Should not happen if we initialize during project create, but handle gracefully
            return self.create_default_for_project(db=db, project_id=project_id, defaults=data.model_dump(exclude_unset=True))
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(this, k, v)
        db.commit()
        db.refresh(this)
        return this

