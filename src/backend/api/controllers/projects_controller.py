from uuid import UUID
from typing import Callable
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.db.models import Project as ProjectModel
from backend.crud import projects_crud
from backend.api.schemas import projects_schema, generics_schema
from backend.api.enums import ProjectStatus


def _raise_not_found(callback: Callable[..., ProjectModel | None], db: Session, id: UUID, **kwargs) -> ProjectModel:
    maybe_project = callback(db=db, id=id, **kwargs)
    if maybe_project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {str(id)!r} not found",
        )
    
    return maybe_project


def get(db: Session, project_id: UUID) -> projects_schema.Project:
    project = _raise_not_found(
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


def get_shallow_list(db: Session, skip: int, limit: int) -> list[projects_schema.ProjectShallow]:
    """Get shallow list of projects without document data for efficient listing."""
    projects_with_count = projects_crud.search_shallow(
        db=db,
        skip=skip,
        limit=limit,
        order_by=[("name", "asc")]
    )
    
    # Convert to shallow schema with metadata
    shallow_projects = []
    for project, doc_count in projects_with_count:
        shallow_data = {
            "id": project.id,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
            "name": project.name,
            "description": project.description,
            "version": project.version,
            "contact_name": project.contact_name,
            "contact_email": project.contact_email,
            "document_count": doc_count,
            "has_documents": doc_count > 0
        }
        shallow_projects.append(projects_schema.ProjectShallow.model_validate(shallow_data))
    
    return shallow_projects


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
       
    project = _raise_not_found(projects_crud.update, db=db, id=project_id, data=project_data)
    return get(db=db, project_id=project.id)


def delete(db: Session, project_id: UUID) -> generics_schema.Success:
    project = _raise_not_found(callback=projects_crud.delete, db=db, id=project_id)
    return generics_schema.Success(message=f"Project {project.name!r} deleted successfully")


def summarize(db: Session, project_id: UUID) -> projects_schema.ProjectSummary:
    """Generate a comprehensive summary of a project including all documents and analytics."""
    # Get project with all related data
    project = _raise_not_found(
        projects_crud.read,
        db=db,
        id=project_id,
        join_with=[ "documents.files", "documents.prompts", "documents.selections" ]
    )
    
    # Basic project info
    document_count = len(project.documents)
    
    # File analysis
    documents_with_original_files = 0
    documents_with_redacted_files = 0
    total_original_files_size = 0
    total_redacted_files_size = 0
    
    # Processing components
    total_prompts = 0
    total_selections = 0
    total_tags = 0
    total_ai_selections = 0
    total_manual_selections = 0
    
    # Language and temperature analysis
    all_languages = []
    temperatures = []
    
    # Timeline analysis
    document_dates = []
    
    # Tag frequency analysis
    tag_counts = {}
    
    for document in project.documents:
        document_dates.append(document.created_at)
        
        # File analysis
        has_original = document.original_file is not None
        has_redacted = document.redacted_file is not None
        
        if has_original:
            documents_with_original_files += 1
            total_original_files_size += document.original_file.file_size
        
        if has_redacted:
            documents_with_redacted_files += 1
            total_redacted_files_size += document.redacted_file.file_size
        
        # Processing components counts
        total_prompts += len(document.prompts)
        total_selections += len(document.selections)
        total_tags += len(document.tags)
        
        # Selection analysis
        for selection in document.selections:
            if selection.is_ai_generated:
                total_ai_selections += 1
            else:
                total_manual_selections += 1
        
        # Language and temperature analysis
        for prompt in document.prompts:
            all_languages.extend(prompt.languages)
            temperatures.append(prompt.temperature)
        
        # Tag frequency analysis
        for tag in document.tags:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    
    # Calculate processed documents (those with redacted files)
    processed_documents_count = documents_with_redacted_files
    
    # Calculate totals
    total_files_size = total_original_files_size + total_redacted_files_size
    
    # Language analysis
    unique_languages = list(set(all_languages))
    average_temperature = sum(temperatures) / len(temperatures) if temperatures else None
    
    # Timeline analysis
    oldest_document_date = min(document_dates) if document_dates else None
    newest_document_date = max(document_dates) if document_dates else None
    
    # Top tags (sorted by frequency, top 10)
    most_common_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    # Determine project status
    if document_count == 0:
        status = ProjectStatus.AWAITING
    elif processed_documents_count == document_count:
        status = ProjectStatus.COMPLETED
    else:
        status = ProjectStatus.IN_PROGRESS
    
    return projects_schema.ProjectSummary(
        project_id=project.id,
        name=project.name,
        description=project.description,
        version=project.version,
        contact_name=project.contact_name,
        contact_email=project.contact_email,
        created_at=project.created_at,
        updated_at=project.updated_at,
        status=status,
        document_count=document_count,
        documents_with_original_files=documents_with_original_files,
        documents_with_redacted_files=documents_with_redacted_files,
        processed_documents_count=processed_documents_count,
        total_original_files_size=total_original_files_size,
        total_redacted_files_size=total_redacted_files_size,
        total_files_size=total_files_size,
        total_prompts=total_prompts,
        total_selections=total_selections,
        total_tags=total_tags,
        total_ai_selections=total_ai_selections,
        total_manual_selections=total_manual_selections,
        unique_languages=unique_languages,
        average_temperature=average_temperature,
        oldest_document_date=oldest_document_date,
        newest_document_date=newest_document_date,
        most_common_tags=most_common_tags
    )
