from typing import Literal
from uuid import UUID
from sqlalchemy.orm import Session, joinedload

from sero.db.models import Prompt
from sero.api.schemas import prompts_schema
from sero.crud.base import BaseCrud


class PromptCrud(BaseCrud[Prompt, prompts_schema.PromptCreate, prompts_schema.PromptUpdate]):
    def read_with_backrefs(self, db: Session, prompt_id: UUID) -> Prompt | None:
        prompt = (
            db.query(Prompt)
            .filter(Prompt.id == prompt_id)
            .options(
                joinedload(Prompt.project),
                joinedload(Prompt.document)
            )
            .first()
        )
        return prompt


    def read_list_with_backrefs(self, db: Session, owner_id: UUID | None = None, owner: Literal["project", "document"] | None = None, skip: int = 0, limit: int = 100) -> list[Prompt]:
        prompts = (
            db.query(Prompt)
            .filter(getattr(Prompt, f"{owner}_id") == owner_id if owner_id is not None else Prompt.id.is_not(None))
            .options(
                joinedload(Prompt.project),
                joinedload(Prompt.document)
            )
            .order_by(Prompt.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return prompts
    

    def read_list_by_file(self, db: Session, file_id: UUID, skip: int, limit: int) -> list[Prompt]:
        prompts = (
            db.query(Prompt)
            .filter(Prompt.file_id == file_id)
            .order_by(Prompt.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return prompts


    def delete_by_file(self, db: Session, file_id: UUID) -> list[Prompt]:
        prompts = (
            db.query(Prompt)
            .filter(Prompt.file_id == file_id)
            .delete()
        )
        db.commit()
        return prompts


    def create_in_bulk(self, db: Session, file_id: UUID, prompts_data: list[prompts_schema.PromptCreate]) -> list[Prompt]:
        prompt_models = [ Prompt(**i.model_dump(exclude_unset=True), file_id=file_id ) for i in prompts_data ]
        db.add_all(prompt_models)
        db.commit()
        [ db.refresh(i) for i in prompt_models ]
        return prompt_models
