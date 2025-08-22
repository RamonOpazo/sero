from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.crud import projects_crud, support_crud
from backend.api.schemas import projects_schema, generics_schema
from backend.api.enums import ProjectStatus
from collections import Counter


def get(db: Session, project_id: UUID) -> projects_schema.Project:
    project = support_crud.apply_or_404(
        projects_crud.read,
        db=db,
        id=project_id,
        join_with=["documents"]
    )
    return projects_schema.Project.model_validate(project)


def get_list(db: Session, skip: int, limit: int) -> list[projects_schema.Project]:
    projects = projects_crud.search(
        db=db,
        skip=skip,
        limit=limit,
        order_by=[("name", "asc")],
        join_with=["documents"]
    )
    return [ projects_schema.Project.model_validate(i) for i in projects ]


def get_shallow_list(db: Session, skip: int, limit: int, **filters) -> list[projects_schema.ProjectShallow]:
    records = projects_crud.search_shallow(
        db=db,
        skip=skip,
        limit=limit,
        order_by=[("name", "asc")],
        **filters,
    )

    return support_crud.build_shallow_list(
        records,
        schema_cls=projects_schema.ProjectShallow,
        transforms={
            "document_count": lambda ctx: int(ctx["record"][1] or 0),
            "has_documents": lambda ctx: (int(ctx["record"][1] or 0) > 0),
        },
    )


def search_list(db: Session, skip: int, limit: int, name: str | None, version: int | None) -> list[projects_schema.Project]:
    projects = projects_crud.search(
        db=db,
        skip=skip,
        limit=limit,
        order_by=[("name", "asc")],
        join_with=["documents"],
        version=version,
        **({"name": ("like", name.replace("*", "%"))} if name is not None else {})  # dismiss name field filter if name is None, else, replace wildcard
    )
    return [ projects_schema.Project.model_validate(i) for i in projects ]


def create(db: Session, project_data: projects_schema.ProjectCreate) -> projects_schema.Project:
    if projects_crud.exist_with_name(db=db, name=project_data.name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project with name {project_data.name!r} already exists"
        )
    
    project = projects_crud.create(db=db, data=project_data)
    return projects_schema.Project.model_validate(project)


def update(db: Session, project_id: UUID, project_data: projects_schema.ProjectUpdate) -> projects_schema.Project:    
    if project_data.name and projects_crud.exist_with_name(db=db, name=project_data.name, exclude_id=project_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project with name {project_data.name!r} already exists"
        )
       
    project = support_crud.apply_or_404(projects_crud.update, db=db, id=project_id, data=project_data)
    return get(db=db, project_id=project.id)


def delete(db: Session, project_id: UUID) -> generics_schema.Success:
    project = support_crud.apply_or_404(callback=projects_crud.delete, db=db, id=project_id)
    return generics_schema.Success(message=f"Project {project.name!r} deleted successfully")


def summarize(db: Session, project_id: UUID) -> projects_schema.ProjectSummary:
    project = support_crud.apply_or_404(
        projects_crud.read,
        db=db,
        id=project_id,
        join_with=[ "documents.files", "documents.prompts", "documents.selections", "documents.ai_settings" ]
    )

    def doc_iter(ctx):
        return ctx["model"].documents or []

    return support_crud.build_summary(
        schema_cls=projects_schema.ProjectSummary,
        model=project,
        transforms={
            "project_id": lambda ctx: ctx["model"].id,
            "status": lambda ctx: (
                ProjectStatus.AWAITING if len(doc_iter(ctx)) == 0 else (
                    ProjectStatus.COMPLETED if sum(1 for d in doc_iter(ctx) if d.redacted_file is not None) == len(doc_iter(ctx)) else ProjectStatus.IN_PROGRESS
                )
            ),
            "document_count": lambda ctx: len(doc_iter(ctx)),
            "documents_with_original_files": lambda ctx: sum(1 for d in doc_iter(ctx) if d.original_file is not None),
            "documents_with_redacted_files": lambda ctx: sum(1 for d in doc_iter(ctx) if d.redacted_file is not None),
            "processed_documents_count": lambda ctx: sum(1 for d in doc_iter(ctx) if d.redacted_file is not None),
            "total_original_files_size": lambda ctx: sum((d.original_file.file_size for d in doc_iter(ctx) if d.original_file), 0),
            "total_redacted_files_size": lambda ctx: sum((d.redacted_file.file_size for d in doc_iter(ctx) if d.redacted_file), 0),
            "total_files_size": lambda ctx: (
                sum((d.original_file.file_size for d in doc_iter(ctx) if d.original_file), 0)
                + sum((d.redacted_file.file_size for d in doc_iter(ctx) if d.redacted_file), 0)
            ),
            "total_prompts": lambda ctx: sum(len(d.prompts) for d in doc_iter(ctx)),
            "total_selections": lambda ctx: sum(len(d.selections) for d in doc_iter(ctx)),
            "total_tags": lambda ctx: sum(len(d.tags) for d in doc_iter(ctx)),
            "total_ai_selections": lambda ctx: sum(1 for d in doc_iter(ctx) for s in d.selections if s.is_ai_generated),
            "total_manual_selections": lambda ctx: sum(1 for d in doc_iter(ctx) for s in d.selections if not s.is_ai_generated),
            "oldest_document_date": lambda ctx: (min((d.created_at for d in doc_iter(ctx)), default=None)),
            "newest_document_date": lambda ctx: (max((d.created_at for d in doc_iter(ctx)), default=None)),
            "most_common_tags": lambda ctx, Counter=Counter: (
                sorted(Counter(tag for d in doc_iter(ctx) for tag in d.tags).items(), key=lambda x: x[1], reverse=True)[:10]
            ),
        },
    )
