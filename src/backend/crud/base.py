from uuid import UUID
from pydantic import BaseModel
from typing import Any, Literal, Generic, Type, TypeVar, overload
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone

from backend.db.models import Base


ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


type _operation = Literal["eq", "neq", "gt", "ge", "lt", "le", "like", "not-like", "is", "not-is", "in", "not-in"]


class BaseCrud(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]) -> None:
        self.model = model


    def _resolve_filter_operation(self, field: str, data: tuple[_operation, Any] | str):
        if not hasattr(self.model, field):
            raise AttributeError(f"Model {self.model.__name__!r} has no attribute {field!r}")
        
        col = getattr(self.model, field)
        op, value = data if isinstance(data, tuple) else ("is", None) if data is None else ("eq", data)
        match op:
            case "eq" | "neq" | "gt" | "ge" | "lt" | "le":
                return getattr(col, f"__{op}__")(value)

            case "like":
                return col.like(value)

            case "not-like":
                return col.not_like(value)

            case "is":
                return col.is_(value)

            case "not-is":
                return col.not_is(value)

            case "in":
                return col.in_(value)

            case "not-in":
                return col.not_in(value)
            
            case _:
                raise ValueError(f"Unrecognized filter operation: {op!r}")


    @overload
    def read(self, db: Session, id: UUID) -> ModelType | None: ...
    
    @overload
    def read(self, db: Session, id: UUID, join_with: list[str]) -> ModelType | None: ...
    
    def read(self, db: Session, id: UUID, join_with: list[str] | None = None) -> ModelType | None:
        _sanitized_joining = (
            joinedload(getattr(self.model, field))
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
        _sanitized_ordering = (
            getattr(getattr(self.model, field), direction)()
            for field, direction in order_by or []
        )
        _sanitized_joining = (
            joinedload(getattr(self.model, field))
            for field in join_with or []
        )
        _sanitized_filters = (
            self._resolve_filter_operation(field=field, data=data)
            for field, data in kwargs.items()
        )        
        these = (
            db.query(self.model)
            .filter(*_sanitized_filters)
            .options(*_sanitized_joining)
            .order_by(*_sanitized_ordering)
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
