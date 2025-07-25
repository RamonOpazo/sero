from typing import Literal
from uuid import UUID
from sqlalchemy.orm import Session, joinedload

from backend.db.models import Selection
from backend.api.schemas import selections_schema
from backend.crud.base import BaseCrud


class SelectionCrud(BaseCrud[Selection, selections_schema.SelectionCreate, selections_schema.SelectionUpdate]):
    def read_with_backrefs(self, db: Session, selection_id: UUID) -> Selection | None:
        selection = (
            db.query(Selection)
            .filter(Selection.id == selection_id)
            .options(
                joinedload(Selection.document)
            )
            .first()
        )
        return selection


    def read_list_with_backrefs(self, db: Session, owner_id: UUID | None = None, owner: Literal["document"] | None = None, skip: int = 0, limit: int = 100) -> list[Selection]:
        selections = (
            db.query(Selection)
            .filter(getattr(Selection, f"{owner}_id") == owner_id if owner_id is not None else Selection.id.is_not(None))
            .options(
                joinedload(Selection.document)
            )
            .order_by(Selection.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return selections
    

    def read_list_by_document(self, db: Session, document_id: UUID, skip: int = 0, limit: int = 100) -> list[Selection]:
        selections = (
            db.query(Selection)
            .filter(Selection.document_id == document_id)
            .order_by(Selection.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return selections


    def delete_by_document(self, db: Session, document_id: UUID) -> int:
        deleted_count = (
            db.query(Selection)
            .filter(Selection.document_id == document_id)
            .delete()
        )
        db.commit()
        return deleted_count


    def create_in_bulk(self, db: Session, document_id: UUID, selections_data: list[selections_schema.SelectionCreate]) -> list[Selection]:
        selection_models = [ Selection(**i.model_dump(exclude_unset=True), document_id=document_id) for i in selections_data ]
        db.add_all(selection_models)
        db.commit()
        [ db.refresh(i) for i in selection_models ]
        return selection_models

    def read_list(self, db: Session, skip: int = 0, limit: int = 100) -> list[Selection]:
        selections = (
            db.query(Selection)
            .order_by(Selection.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return selections
