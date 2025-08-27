from uuid import UUID
from typing import override
from sqlalchemy.orm import Session
import base64
from fastapi import HTTPException, status

from backend.core.security import security_manager
from backend.api.schemas import projects_schema
from backend.db.models import Project
from backend.crud.base import BaseCrud


class ProjectCrud(BaseCrud[Project, projects_schema.ProjectCreate, projects_schema.ProjectUpdate]):
    @override
    def create(self, db: Session, data: projects_schema.ProjectCreate) -> Project:
        # Decrypt password using ephemeral key
        try:
            ciphertext = base64.b64decode(data.encrypted_password)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid encrypted_password (base64)")

        plaintext = security_manager.decrypt_with_ephemeral_key(key_id=data.key_id, encrypted_data=ciphertext)
        if not plaintext:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired key/ciphertext")

        # Validate password strength
        if not security_manager.is_strong_password(plaintext):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password does not meet strength requirements")

        # Create project and set password hash
        project = self.model(**data.model_dump(exclude=["key_id", "encrypted_password"]))
        password_hash = security_manager.hash_password(plaintext)
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
