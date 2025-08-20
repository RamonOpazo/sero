from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.core.database import get_db_session
from backend.api.schemas import prompts_schema, generics_schema
from backend.api.controllers import prompts_controller


router = APIRouter()


@router.post("", response_model=prompts_schema.Prompt)
async def create_prompt(
    prompt_data: prompts_schema.PromptCreate,
    db: Session = Depends(get_db_session)
):
    """Create a new prompt."""
    return prompts_controller.create(db=db, prompt_data=prompt_data)


@router.get("", response_model=list[prompts_schema.Prompt])
async def list_prompts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session)
):
    """Get paginated list of all prompts."""
    return prompts_controller.get_list(db=db, skip=skip, limit=limit)


@router.get("/id/{prompt_id}", response_model=prompts_schema.Prompt)
async def get_prompt(
    prompt_id: UUID,
    db: Session = Depends(get_db_session)
):
    """Get a single prompt by ID."""
    return prompts_controller.get(db=db, prompt_id=prompt_id)


@router.put("/id/{prompt_id}", response_model=prompts_schema.Prompt)
async def update_prompt(
    prompt_id: UUID,
    prompt_data: prompts_schema.PromptUpdate,
    db: Session = Depends(get_db_session)
):
    """Update a prompt."""
    return prompts_controller.update(db=db, prompt_id=prompt_id, prompt_data=prompt_data)


@router.delete("/id/{prompt_id}", response_model=generics_schema.Success)
async def delete_prompt(
    prompt_id: UUID,
    db: Session = Depends(get_db_session)
):
    """Delete a prompt."""
    return prompts_controller.delete(db=db, prompt_id=prompt_id)
