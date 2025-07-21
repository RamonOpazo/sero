from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from sero.core.security import security_manager
from sero.crud import projects_crud, documents_crud, files_crud
from sero.api.schemas import projects_schema, documents_schema, files_schema, generics_schema
from sero.api.enums import DocumentStatus


def get(db: Session, project_id: UUID) -> projects_schema.Project:
    project = projects_crud.read_with_backrefs(db, id=project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {str(project_id)!r} not found"
        )
    
    return projects_schema.Project.model_validate(project)


def get_list(db: Session, skip: int, limit: int) -> list[projects_schema.Project]:
    projects = projects_crud.search_list(db=db, skip=skip, limit=limit, name=None, version=None)
    return [ projects_schema.Project.model_validate(i) for i in projects ]


def search_list(db: Session, skip: int, limit: int, name: str | None, version: int | None) -> list[projects_schema.Project]:
    projects = projects_crud.search_list(db=db, skip=skip, limit=limit, name=name, version=version)
    return [ projects_schema.Project.model_validate(i) for i in projects ]


def create(db: Session, project_data: projects_schema.ProjectCreate) -> projects_schema.Project:
    if projects_crud.exist_with_name(db=db, name=project_data.name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project with name {project_data.name!r} already exists"
        )
    
    project = projects_crud.create(db=db, data=project_data)
    return projects_schema.Project.model_validate(project)


def summarize(db: Session, project_id: UUID) -> generics_schema.Success:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)


def update(db: Session, project_id: UUID, project_data: projects_schema.ProjectUpdate) -> projects_schema.Project:
    project = projects_crud.read(db=db, id=project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {str(project_id)!r} not found"
        )
    
    if project_data.name and projects_crud.exist_with_name(db=db, name=project_data.name, exclude_id=project_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project with name {project_data.name!r} already exists"
        )
       
    updated_project = projects_crud.update(db=db, id=project_id, data=project_data)
    return get(db=db, project_id=updated_project.id)


def delete(db: Session, project_id: UUID) -> generics_schema.Success:
    project = projects_crud.read_with_backrefs(db=db, id=project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {str(project_id)!r} not found"
        )
    
    if len(project.documents) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete project {project.name!r} with documents; delete documents first"
        )
    
    projects_crud.delete(db=db, id=project_id)
    return generics_schema.Success(
        message=f"Project {project.name!r} deleted successfully"
    )


def upload_file(db: Session, upload_data: files_schema.FileUpload, password: str) -> documents_schema.Document:
    file_blob = upload_data.file.file.read()
    safe_filename = security_manager.sanitize_filename(upload_data.file.filename)
    # upload_data.file.seek(0)
    
    if not security_manager.validate_file_size(file_size=upload_data.file.size):
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large; maximum size: {security_manager.settings.processing.max_file_size / (1024*1024):.1f} MB"
        )
    
    if not security_manager.validate_file_type(mime_type=upload_data.file.content_type, file_data=file_blob):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid PDF file; only PDF files are allowed"
        )

    if not projects_crud.verify_password(db=db, id=upload_data.project_id, password=password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid project password"
        )

    if files_crud.exist_with_original_filename(db=db, project_id=upload_data.project_id, filename=safe_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Filename {safe_filename!r} already exists"
        )
    
    document = documents_crud.create(db=db, data=documents_schema.DocumentCreate(
        project_id=upload_data.project_id,
        description=upload_data.description,
        status=DocumentStatus.PENDING
    ))
    
    encrypted_data, salt = security_manager.encrypt_data(data=file_blob, password=password)
    file_hash = security_manager.generate_file_hash(file_data=file_blob)

    try:
        files_crud.create(db=db, data=files_schema.FileCreate(
            filename=safe_filename,
            mime_type=upload_data.file.content_type,
            data=encrypted_data,
            is_original_file=True,
            salt=salt,
            file_hash=file_hash,
            document_id=document.id
        ))
    
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document: {str(err)}"
        )

    return documents_schema.Document.model_validate(document)


def bulk_upload_files(db: Session, uploads_data: list[files_schema.FileUpload], password: str) -> generics_schema.Success:
    results = []
    errors = []

    for data in uploads_data:
        try:
            file_data = data.model_copy(update={ "description": f"[Bulk upload]: {data.description}" })
            document = upload_file(db=db, upload_data=file_data, password=password)
            results.append({
                "filename": document.original_file.filename,
                "file_id": str(document.original_file.id),
                "status": "success"
            })
            
        except Exception as err:
            safe_filename = security_manager.sanitize_filename(file_data.file.filename)
            errors.append({
                "filename": safe_filename,
                "error": str(err),
                "status": "failed"
            })
    
    return generics_schema.Success(
        message=f"Bulk upload completed: {len(results)} successful, {len(errors)} failed",
        detail={
            "successful_uploads": results,
            "failed_uploads": errors,
            "total_files": len(uploads_data),
            "success_count": len(results),
            "error_count": len(errors)
        }
    )
