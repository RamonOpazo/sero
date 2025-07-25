from uuid import UUID
from sqlalchemy.orm import Session, joinedload

from backend.db.models import Redacted
from backend.api.schemas import redacted_schema
from backend.crud.base import BaseCrud


class RedactedCrud(BaseCrud[Redacted, redacted_schema.RedactedCreate, redacted_schema.RedactedUpdate]):
    def read_with_backrefs(self, db: Session, redacted_id: UUID) -> Redacted | None:
        redacted = (
            db.query(Redacted)
            .filter(Redacted.id == redacted_id)
            .options(joinedload(Redacted.documents))
            .first()
        )
        return redacted

    def read_list(self, db: Session, skip: int = 0, limit: int = 100) -> list[Redacted]:
        redacted = (
            db.query(Redacted)
            .order_by(Redacted.id)
            .offset(skip)
            .limit(limit)
            .all()
        )
        return redacted
