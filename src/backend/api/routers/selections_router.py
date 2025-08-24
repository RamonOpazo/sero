from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.core.database import get_db_session
from backend.api.schemas import selections_schema, generics_schema
from backend.api.controllers import selections_controller


router = APIRouter()


@router.post("", response_model=selections_schema.Selection)
async def create_selection(
    selection_data: selections_schema.SelectionCreate,
    db: Session = Depends(get_db_session)
):
    """Create a new selection."""
    return selections_controller.create(db=db, selection_data=selection_data)


@router.get("", response_model=list[selections_schema.Selection])
async def list_selections(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session)
):
    """Get paginated list of all selections."""
    return selections_controller.get_list(db=db, skip=skip, limit=limit)


@router.get("/id/{selection_id}", response_model=selections_schema.Selection)
async def get_selection(
    selection_id: UUID,
    db: Session = Depends(get_db_session)
):
    """Get a single selection by ID."""
    return selections_controller.get(db=db, selection_id=selection_id)


@router.put("/id/{selection_id}", response_model=selections_schema.Selection)
async def update_selection(
    selection_id: UUID,
    selection_data: selections_schema.SelectionUpdate,
    db: Session = Depends(get_db_session)
):
    """Update a selection."""
    return selections_controller.update(db=db, selection_id=selection_id, selection_data=selection_data)


@router.delete("/id/{selection_id}", response_model=generics_schema.Success)
async def delete_selection(
    selection_id: UUID,
    db: Session = Depends(get_db_session)
):
    """Delete a selection."""
    return selections_controller.delete(db=db, selection_id=selection_id)


@router.patch("/id/{selection_id}/convert-to-staged", response_model=selections_schema.Selection)
async def convert_committed_to_staged(
    selection_id: UUID,
    db: Session = Depends(get_db_session),
):
    """Convert a COMMITTED selection to STAGED_EDITION (explicit transition)."""
    return selections_controller.convert_committed_to_staged(db=db, selection_id=selection_id)
