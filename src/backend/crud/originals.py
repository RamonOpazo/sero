from uuid import UUID
from sqlalchemy.orm import Session, joinedload

from backend.db.models import Original
from backend.api.schemas import originals_schema
from backend.crud.base import BaseCrud


class OriginalCrud(BaseCrud[Original, originals_schema.OriginalCreate, originals_schema.OriginalUpdate]):
    def read_with_backrefs(self, db: Session, original_id: UUID) -> Original | None:
        original = (
            db.query(Original)
            .filter(Original.id == original_id)
            .options(joinedload(Original.document))
            .first()
        )
        return original

    def read_list(self, db: Session, skip: int = 0, limit: int = 100) -> list[Original]:
        originals = (
            db.query(Original)
            .order_by(Original.id)
            .offset(skip)
            .limit(limit)
            .all()
        )
        return originals

