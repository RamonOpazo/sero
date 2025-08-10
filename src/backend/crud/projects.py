from uuid import UUID
from typing import override
from sqlalchemy.orm import Session

from backend.core.security import security_manager
from backend.api.schemas import projects_schema
from backend.db.models import Project
from backend.crud.base import BaseCrud


class ProjectCrud(BaseCrud[Project, projects_schema.ProjectCreate, projects_schema.ProjectUpdate]):
    @override
    def create(self, db: Session, data: projects_schema.ProjectCreate) -> Project:
        project = self.model(**data.model_dump(exclude=["password"]))
        password_hash = security_manager.hash_password(data.password)
        project.password_hash = password_hash.encode("utf-8")
        
        db.add(project)
        db.commit()
        db.refresh(project)
        return project
    

    def read_by_name(self, db: Session, name: str) -> Project | None:
        project = (
            db.query(Project)
            .filter(Project.name == name)
            .first()
        )
        return project


    def exist_with_name(self, db: Session, name: str, exclude_id: UUID | None = None) -> bool:
        project = (
            db.query(Project)
            .filter(
                Project.name == name,
                Project.id != exclude_id if exclude_id else Project.id.is_not(None)
            )
            .first()
        )
        return project is not None
    
    
    def verify_password(self, db: Session, id: UUID, password: str) -> bool:
        project = self.read(db=db, id=id)
        if project is None:
            return False
           
        return security_manager.verify_password(
            plain_password=password,
            hashed_password=project.password_hash
        )
    
    def search_shallow(self, db: Session, skip: int = 0, limit: int = 100, order_by: list[tuple[str, str]] | None = None, **kwargs) -> list[tuple[Project, int]]:
        """Search projects with document count but without loading document relationships."""
        from sqlalchemy import func
        from backend.db.models import Document
        
        _sanitized_ordering = (
            getattr(getattr(self.model, field), direction)()
            for field, direction in order_by or []
        )
        _sanitized_filters = (
            self._resolve_filter_operation(field=field, data=data)
            for field, data in kwargs.items()
            if data is not None
        )
        
        results = (
            db.query(
                self.model,
                func.count(Document.id).label('document_count')
            )
            .outerjoin(Document, self.model.id == Document.project_id)
            .filter(*_sanitized_filters)
            .group_by(self.model.id)
            .order_by(*_sanitized_ordering)
            .offset(skip)
            .limit(limit)
            .all()
        )
        
        return results
