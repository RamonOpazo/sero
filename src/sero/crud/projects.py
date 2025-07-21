from uuid import UUID
from typing import override
from sqlalchemy.orm import Session, joinedload

from sero.core.security import security_manager
from sero.api.schemas import projects_schema
from sero.db.models import Project
from sero.crud.base import BaseCrud


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


    def read_with_backrefs(self, db: Session, id: UUID) -> Project | None:
        project = (
            db.query(Project)
            .filter(Project.id == id)
            .options(joinedload(Project.documents))
            .first()
        )
        return project
    

    def read_list_with_backrefs(self, db: Session, skip: int, limit: int) -> list[Project]:
        projects = (
            db.query(Project)
            .options(joinedload(Project.documents))
            .order_by(Project.name)
            .offset(skip)
            .limit(limit)
            .all()
        )
        return projects
    

    def search_list(self, db: Session, skip: int, limit: int, name: str | None, version: int | None) -> list[Project]:
        files = (
            db.query(Project)
            .order_by(Project.name)
            .options(joinedload(Project.documents))
            .filter(
                Project.name.like(name.replace("*", "%")) if name else True,
                Project.version == version if version else True
            )
            .offset(skip)
            .limit(limit)
            .all()
        )
        return files


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
