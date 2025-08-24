from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.crud import selections_crud, support_crud, documents_crud
from backend.api.schemas import selections_schema, generics_schema
from backend.api.enums import CommitState


def create(db: Session, selection_data: selections_schema.SelectionCreate) -> selections_schema.Selection:
    """Create a new selection."""
    # Ensure document exists
    support_crud.apply_or_404(documents_crud.read, db=db, id=selection_data.document_id)
    # Force staged by default
    if getattr(selection_data, "state", None) is None:
        selection_data.state = CommitState.STAGED_CREATION
    selection = selections_crud.create(db=db, data=selection_data)
    return selections_schema.Selection.model_validate(selection)


def get(db: Session, selection_id: UUID) -> selections_schema.Selection:
    """Get a single selection by ID with document relation."""
    selection = support_crud.apply_or_404(
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
    """Update a selection by ID with server-side enforcement of commit rules."""
    # Load current selection
    current = support_crud.apply_or_404(selections_crud.read, db=db, id=selection_id)

    # Prevent geometry updates to committed selections unless explicitly converted
    if current.state == CommitState.COMMITTED:
        # Only allow state flip requests here, not geometry
        only_state_change = (
            selection_data.state is not None
            and selection_data.x is None
            and selection_data.y is None
            and selection_data.width is None
            and selection_data.height is None
            and selection_data.page_number is None
            and selection_data.confidence is None
        )
        if not only_state_change:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Committed selections cannot be edited; convert to staged edition first")

    # If transitioning to staged_deletion, accept even if committed? No: client must convert first
    if selection_data.state == CommitState.STAGED_DELETION and current.state == CommitState.COMMITTED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Committed selections must be converted to staged edition before staging for deletion")

    # Persist update
    updated = support_crud.apply_or_404(selections_crud.update, db=db, id=selection_id, data=selection_data)
    return selections_schema.Selection.model_validate(updated)


def delete(db: Session, selection_id: UUID) -> generics_schema.Success:
    """Delete a selection by ID.
    Allowed ONLY if current state is STAGED_DELETION. All other states must be transitioned explicitly and committed.
    """
    current = support_crud.apply_or_404(selections_crud.read, db=db, id=selection_id)
    if current.state != CommitState.STAGED_DELETION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deletion is only allowed for selections in STAGED_DELETION state",
        )
    support_crud.apply_or_404(selections_crud.delete, db=db, id=selection_id)
    return generics_schema.Success(message=f"Selection with ID {str(selection_id)!r} deleted successfully")


def convert_committed_to_staged(db: Session, selection_id: UUID) -> selections_schema.Selection:
    """Convert a COMMITTED selection to STAGED_EDITION explicitly (no geometry changes)."""
    current = support_crud.apply_or_404(selections_crud.read, db=db, id=selection_id)
    if current.state != CommitState.COMMITTED:
        # If it's already staged, just echo back; if staged_deletion, keep as is
        return selections_schema.Selection.model_validate(current)
    # Flip state to staged_edition
    updated = support_crud.apply_or_404(
        selections_crud.update,
        db=db,
        id=selection_id,
        data=selections_schema.SelectionUpdate(state=CommitState.STAGED_EDITION)
    )
    return selections_schema.Selection.model_validate(updated)
