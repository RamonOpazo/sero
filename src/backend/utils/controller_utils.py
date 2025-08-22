from __future__ import annotations
from typing import Callable, TypeVar
from uuid import UUID
from fastapi import HTTPException, status

T = TypeVar("T")


def get_or_404(callback: Callable[..., T | None], *, entity_name: str, not_found_id: UUID | None = None, **kwargs) -> T:
    """Call a fetcher and raise 404 if the result is None.
    - entity_name: Human-friendly entity label for error messages
    - not_found_id: Optional ID to include in the message
    - kwargs: Parameters forwarded to the callback
    """
    result = callback(**kwargs)
    if result is None:
        detail = (
            f"{entity_name} with ID {str(not_found_id)!r} not found"
            if not_found_id is not None else f"{entity_name} not found"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
        )
    return result


def assert_exists_or_404(exists: bool, *, entity_name: str, entity_id: UUID) -> None:
    """Raise 404 if `exists` is False."""
    if not exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{entity_name} with ID {str(entity_id)!r} not found",
        )

