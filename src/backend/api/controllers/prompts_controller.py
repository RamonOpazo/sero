from uuid import UUID
from sqlalchemy.orm import Session

from backend.crud import prompts_crud, support_crud
from backend.api.schemas import prompts_schema, generics_schema


def create(db: Session, prompt_data: prompts_schema.PromptCreate) -> prompts_schema.Prompt:
    """Create a new prompt."""
    prompt = prompts_crud.create(db=db, data=prompt_data)
    return prompts_schema.Prompt.model_validate(prompt)


def get(db: Session, prompt_id: UUID) -> prompts_schema.Prompt:
    """Get a single prompt by ID with document relation."""
    prompt = support_crud.get_or_404(
        prompts_crud.read,
        db=db,
        id=prompt_id,
        join_with=["document"]
    )
    return prompts_schema.Prompt.model_validate(prompt)


def get_list(db: Session, skip: int, limit: int) -> list[prompts_schema.Prompt]:
    """Get paginated list of all prompts."""
    prompts = prompts_crud.search(
        db=db,
        skip=skip,
        limit=limit,
        order_by=[("created_at", "desc")],
        join_with=["document"]
    )
    return [ prompts_schema.Prompt.model_validate(prompt) for prompt in prompts ]


def update(db: Session, prompt_id: UUID, prompt_data: prompts_schema.PromptUpdate) -> prompts_schema.Prompt:
    """Update a prompt by ID."""
    prompt = support_crud.get_or_404(prompts_crud.update, db=db, id=prompt_id, data=prompt_data)
    return prompts_schema.Prompt.model_validate(prompt)


def delete(db: Session, prompt_id: UUID) -> generics_schema.Success:
    """Delete a prompt by ID."""
    support_crud.get_or_404(prompts_crud.delete, db=db, id=prompt_id)
    return generics_schema.Success(message=f"Prompt with ID {str(prompt_id)!r} deleted successfully")
