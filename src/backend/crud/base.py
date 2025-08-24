from uuid import UUID
from pydantic import BaseModel
from typing import Any, Literal, Generic, Type, TypeVar, overload
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.attributes import InstrumentedAttribute
from datetime import datetime, timezone

from backend.db.models import Base


ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


type _operation = Literal["eq", "neq", "gt", "ge", "lt", "le", "like", "not-like", "is", "not-is", "in", "not-in"]


class BaseCrud(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]) -> None:
        self.model = model
    
    def _get_orderable_attr(self, field: str) -> InstrumentedAttribute | None:
        """Return a column attribute suitable for ordering, or None if unavailable."""
        if not hasattr(self.model, field):
            return None
        attr = getattr(self.model, field)
        return attr if isinstance(attr, InstrumentedAttribute) else None
    
    def _resolve_join_path(self, field: str):
        """Handle nested joins like 'documents.files'."""
        parts = field.split('.')
        try:
            if len(parts) == 1:
                if not hasattr(self.model, parts[0]):
                    raise ValueError(f"Join path error: Model {self.model.__name__!r} has no attribute {parts[0]!r}")
                return joinedload(getattr(self.model, parts[0]))
            
            # Build nested joinedload for multi-level relationships
            current_attr = getattr(self.model, parts[0])
            join_options = joinedload(current_attr)
            
            # Get the related model class for subsequent joins
            current_model = current_attr.property.mapper.class_
            
            for part in parts[1:]:
                if not hasattr(current_model, part):
                    raise ValueError(f"Join path error: Related model {current_model.__name__!r} has no attribute {part!r} in path {field!r}")
                next_attr = getattr(current_model, part)
                join_options = join_options.joinedload(next_attr)
                current_model = next_attr.property.mapper.class_
            
            return join_options
        except AttributeError as e:
            raise ValueError(f"Invalid join path {field!r}: {e}")


    def _resolve_filter_operation(self, field: str, data: tuple[_operation, Any] | str):
        if not hasattr(self.model, field):
            raise AttributeError(f"Model {self.model.__name__!r} has no attribute {field!r}")
        
        col = getattr(self.model, field)
        op, value = data if isinstance(data, tuple) else ("is", None) if data is None else ("eq", data)
        match op:
            case "eq":
                return col.__eq__(value)
            case "neq":
                return col.__ne__(value)
            case "gt":
                return col.__gt__(value)
            case "ge":
                return col.__ge__(value)
            case "lt":
                return col.__lt__(value)
            case "le":
                return col.__le__(value)

            case "like":
                return col.like(value)

            case "not-like":
                return col.notlike(value)

            case "is":
                return col.is_(value)

            case "not-is":
                return col.is_not(value)

            case "in":
                return col.in_(value)

            case "not-in":
                return col.notin_(value)
            
            case _:
                raise ValueError(f"Unrecognized filter operation: {op!r}")


    @overload
    def read(self, db: Session, id: UUID) -> ModelType | None: ...
    
    @overload
    def read(self, db: Session, id: UUID, join_with: list[str]) -> ModelType | None: ...
    
    def read(self, db: Session, id: UUID, join_with: list[str] | None = None) -> ModelType | None:
        _sanitized_joining = (
            self._resolve_join_path(field)
            for field in join_with or []
        )
        
        this = (
            db.query(self.model)
            .filter(self.model.id == id)
            .options(*_sanitized_joining)
            .first()
        )
        return this
    

    @overload
    def search(self, db: Session, skip: int, limit: int, **kwargs) -> list[ModelType]: ...

    @overload
    def search(self, db: Session, order_by: list[tuple[str, Literal["desc", "asc"]]], skip: int, limit: int, **kwargs) -> list[ModelType]: ...
    
    @overload
    def search(self, db: Session, join_with: list[str], skip: int, limit: int, **kwargs) -> list[ModelType]: ...

    @overload
    def search(self, db: Session, order_by: list[tuple[str, Literal["desc", "asc"]]], join_with: list[str], skip: int, limit: int, **kwargs) -> list[ModelType]: ...
    
    def search(self, db: Session, skip: int = 0, limit: int = 100, order_by: list[tuple[str, Literal["desc", "asc"]]] | None = None, join_with: list[str] | None = None, **kwargs: tuple[_operation, Any] | Any) -> list[ModelType]:
        # Validate and build ordering
        _orderings: list[Any] = []
        for field, direction in (order_by or []):
            attr = self._get_orderable_attr(field)
            if attr is None:
                raise ValueError(f"Order by error: Model {self.model.__name__!r} has no orderable attribute {field!r}")
            _orderings.append(getattr(attr, direction)())
        # Always ensure created_at DESC as secondary/default ordering when available
        created_attr = self._get_orderable_attr("created_at")
        if created_attr is not None:
            already_ordering_created_at = any(field == "created_at" for field, _ in (order_by or []))
            if not already_ordering_created_at:
                _orderings.append(created_attr.desc())

        # Validate join paths while building
        _sanitized_joining = (
            self._resolve_join_path(field)
            for field in join_with or []
        )
        # Build filters (validation happens inside)
        _sanitized_filters = (
            self._resolve_filter_operation(field=field, data=data)
            for field, data in kwargs.items()
            if data is not None  # Skip None values to avoid IS NULL filtering
        )
        these = (
            db.query(self.model)
            .filter(*_sanitized_filters)
            .options(*_sanitized_joining)
            .order_by(*_orderings)
            .offset(skip)
            .limit(limit)
            .all()
        )
        return these


    def create(self, db: Session, data: CreateSchemaType) -> ModelType:
        this = self.model(**data.model_dump(exclude_unset=True))
        db.add(this)
        db.commit()
        db.refresh(this)
        return this


    def update(self, db: Session, id: UUID, data: UpdateSchemaType) -> ModelType | None:
        this = self.read(db=db, id=id)
        if this is None:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        # Guard immutable fields
        update_data.pop("id", None)
        update_data.pop("created_at", None)
        update_data["updated_at"] = datetime.now(timezone.utc)
        for field in update_data:
            if hasattr(this, field):
                setattr(this, field, update_data[field])

        db.commit()
        db.refresh(this)
        return this


    def delete(self, db: Session, id: UUID) -> ModelType | None:
        this = self.read(db=db, id=id)
        if this is None:
            return None
        
        db.delete(this)
        db.commit()
        return this


    def count(self, db: Session) -> int:
        count = db.query(self.model).count()
        return count


    def exist(self, db: Session, id: UUID) -> bool:
        this = self.read(db=db, id=id)
        return this is not None
