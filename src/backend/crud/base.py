from uuid import UUID
from pydantic import BaseModel
from typing import Generic, Type, TypeVar
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from backend.db.models import Base


ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseCrud(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]) -> None:
        self.model = model


    def read(self, db: Session, id: UUID) -> ModelType | None:
        this = (
            db.query(self.model)
            .filter(self.model.id == id)
            .first()
        )
        return this


    def create(self, db: Session, data: CreateSchemaType) -> ModelType:
        this = self.model(**data.model_dump(exclude_unset=True))
        db.add(this)
        db.commit()
        db.refresh(this)
        return this


    def update(self, db: Session, id: UUID, data: UpdateSchemaType) -> ModelType | None:
        this = self.read(db=db, id=id)
        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.now(timezone.utc)
        [ setattr(this, field, update_data[field]) for field in this.__dict__ if field in update_data ]
        db.commit()
        db.refresh(this)
        return this


    def delete(self, db: Session, id: UUID) -> ModelType:
        this = self.read(db=db, id=id)
        db.delete(this)
        db.commit()
        return this


    def count(self, db: Session) -> int:
        count = db.query(self.model).count()
        return count


    def exist(self, db: Session, id: UUID) -> bool:
        this = self.read(db=db, id=id)
        return this is not None
