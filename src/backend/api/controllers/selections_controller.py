from uuid import UUID
from sqlalchemy.orm import Session

from backend.crud import selections_crud, support_crud
from backend.api.schemas import selections_schema, generics_schema


def create(db: Session, selection_data: selections_schema.SelectionCreate) -> selections_schema.Selection:
    """Create a new selection."""
    selection = selections_crud.create(db=db, data=selection_data)
    return selections_schema.Selection.model_validate(selection)


def get(db: Session, selection_id: UUID) -> selections_schema.Selection:
    """Get a single selection by ID with document relation."""
    selection = support_crud.get_or_404(
        selections_crud.read,
        db=db,
        id=selection_id,
        join_with=["document"]
    )
    return selections_schema.Selection.model_validate(selection)


def get_list(db: Session, skip: int, limit: int) -> list[selections_schema.Selection]:
    """Get paginated list of all selections."""
    selections = selections_crud.search(
        db=db,
        skip=skip,
        limit=limit,
        order_by=[("created_at", "desc")],
        join_with=["document"]
    )
    return [ selections_schema.Selection.model_validate(selection) for selection in selections ]


def update(db: Session, selection_id: UUID, selection_data: selections_schema.SelectionUpdate) -> selections_schema.Selection:
    """Update a selection by ID."""
    selection = support_crud.get_or_404(selections_crud.update, db=db, id=selection_id, data=selection_data)
    return selections_schema.Selection.model_validate(selection)


def delete(db: Session, selection_id: UUID) -> generics_schema.Success:
    """Delete a selection by ID."""
    support_crud.get_or_404(selections_crud.delete, db=db, id=selection_id)
    return generics_schema.Success(message=f"Selection with ID {str(selection_id)!r} deleted successfully")
