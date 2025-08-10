from uuid import UUID
from typing import Callable
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.core.security import security_manager
from backend.db.models import Document as DocumentModel
from backend.crud import documents_crud, prompts_crud, selections_crud, projects_crud, files_crud
from backend.api.schemas import documents_schema, generics_schema, files_schema, prompts_schema, selections_schema
from backend.api.enums import FileType


def _raise_not_found(callback: Callable[..., DocumentModel | None], db: Session, id: UUID, **kwargs) -> DocumentModel:
    maybe_document = callback(db=db, id=id, **kwargs)
    if maybe_document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {str(id)!r} not found",
        )
    
    return maybe_document


def _process_upload(db: Session, project_id: UUID, upload_data: files_schema.FileUpload, password: str) -> tuple[str, str] | documents_schema.DocumentBulkUpload:
    existing_filenames = set(documents_crud.get_existing_filenames_in_project(db=db, project_id=project_id))

    try:
        file_blob = upload_data.file.file.read()
        safe_filename = security_manager.sanitize_filename(upload_data.file.filename)
        if not security_manager.validate_file_size(file_size=len(file_blob)):
            return upload_data.file.filename, "File too large"
    
        if not security_manager.validate_file_type(mime_type=upload_data.file.content_type, file_data=file_blob):
            return upload_data.file.filename, "Invalid PDF; only PDFs allowed"
    
        if safe_filename in existing_filenames:
            return upload_data.file.filename, "Filename already exists in project"
    
        encrypted_data, salt = security_manager.encrypt_data(data=file_blob, password=password)
        file_hash = security_manager.generate_file_hash(file_data=file_blob)
        file_data = files_schema.FileCreate(
            file_hash=file_hash, mime_type=upload_data.file.content_type,
            data=encrypted_data, salt=salt, file_type=FileType.ORIGINAL,
            document_id=None  # Placeholder for bulk operation
        )
        document_data = documents_schema.DocumentCreate(name=safe_filename, project_id=project_id, description=upload_data.description)
    
    except Exception as err:
        return upload_data.file.filename, f"Error: {str(err)}"

    return documents_schema.DocumentBulkUpload(document_data=document_data, file_data=file_data)


def get(db: Session, document_id: UUID) -> documents_schema.Document:
    document = _raise_not_found(
        documents_crud.read, 
        db=db, 
        id=document_id, 
        join_with=["files", "prompts", "selections"]
    )
    return documents_schema.Document.model_validate(document)


def get_list(db: Session, skip: int, limit: int) -> list[documents_schema.Document]:
    documents = documents_crud.search(
        db=db,
        skip=skip,
        limit=limit,
        join_with=["files", "prompts", "selections"]
    )
    return [ documents_schema.Document.model_validate(i) for i in documents ]


def get_shallow_list(db: Session, skip: int, limit: int) -> list[documents_schema.DocumentShallow]:
    """Get shallow list of documents without file, prompt, or selection data for efficient listing."""
    documents_with_counts = documents_crud.search_shallow(
        db=db,
        skip=skip,
        limit=limit,
        order_by=[("name", "asc"), ("created_at", "desc")]
    )
    
    # Convert to shallow schema with metadata
    shallow_documents = []
    for document, file_count, prompt_count, selection_count, has_original, has_redacted in documents_with_counts:
        shallow_data = {
            "id": document.id,
            "created_at": document.created_at,
            "updated_at": document.updated_at,
            "name": document.name,
            "description": document.description,
            "project_id": document.project_id,
            "tags": document.tags,
            "file_count": file_count,
            "prompt_count": prompt_count,
            "selection_count": selection_count,
            "has_original_file": bool(has_original),
            "has_redacted_file": bool(has_redacted),
            "is_processed": bool(has_redacted)
        }
        shallow_documents.append(documents_schema.DocumentShallow.model_validate(shallow_data))
    
    return shallow_documents


def search_list(db: Session, skip: int, limit: int, name: str | None, project_id: UUID | None) -> list[documents_schema.Document]:
    documents = documents_crud.search(
        db=db,
        skip=skip,
        limit=limit,
        order_by=[("name", "asc"), ("created_at", "desc")],
        join_with=["files", "prompts", "selections"],
        project_id=project_id,
        **({"name": ("like", name.replace("*", "%"))} if name is not None else {})  # dismiss name field filter if name is None, else, replace wildcard
    )
    return [ documents_schema.Document.model_validate(i) for i in documents ]


def get_tags(db: Session, document_id: UUID) -> list[str]:
    """Get tags for a document."""
    document = _raise_not_found(documents_crud.read, db=db, id=document_id)
    return list(set(document.tags))




def create(db: Session, document_data: documents_schema.DocumentCreate) -> documents_schema.Document:
    document = documents_crud.create(db=db, data=document_data)
    return documents_schema.Document.model_validate(document)


def create_with_file(db: Session, upload_data: files_schema.FileUpload, password: str) -> documents_schema.Document:
    """Create a document with an associated original PDF file using bulk creation infrastructure."""
    # Verify project password first
    if not projects_crud.verify_password(db=db, id=upload_data.project_id, password=password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid project password"
        )
    
    # Use the existing processing logic
    result = _process_upload(db=db, project_id=upload_data.project_id, upload_data=upload_data, password=password)
    
    # Handle processing errors
    if isinstance(result, tuple):
        filename, error_msg = result
        if "File too large" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large; maximum size: {security_manager.settings.processing.max_file_size / (1024*1024):.1f} MB"
            )
        elif "Invalid PDF" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid PDF file; only PDF files are allowed"
            )
        elif "Filename already exists" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A document with filename '{filename}' already exists in this project"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload document: {error_msg}"
            )
    
    # Use bulk creation for consistency and transaction safety
    try:
        created_documents = documents_crud.bulk_create_with_files(db=db, bulk_data=[result])
        # Return the single created document with joined data
        document = _raise_not_found(
            documents_crud.read, 
            db=db, 
            id=created_documents[0].id, 
            join_with=["files", "prompts", "selections"]
        )
        return documents_schema.Document.model_validate(document)
        
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document: {str(err)}"
        )


def bulk_create_with_files(db: Session, uploads_data: list[files_schema.FileUpload], password: str, template_description: str | None = None) -> generics_schema.Success:
    # Validate inputs and password
    if not uploads_data:
        return generics_schema.Success(
            message="No files provided for upload",
            detail={
                "successful_uploads": [],
                "failed_uploads": [],
                "total_files": 0,
                "success_count": 0,
                "error_count": 0
            }
        )
    
    project_id = uploads_data[0].project_id
    if not projects_crud.verify_password(db=db, id=project_id, password=password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid project password")
    
    if any(upload.project_id != project_id for upload in uploads_data):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="All files must belong to the same project")

    # Run processing logic and filter out failed results
    results = list(map(lambda x: _process_upload(db=db, project_id=project_id, upload_data=x, password=password), uploads_data))
    successes = [ data for data in results if isinstance(data, documents_schema.DocumentBulkUpload) ]
    errors = [ error for error in results if isinstance(error, tuple) ]
    
    # Apply template description to successful results if provided
    if template_description:
        for success in successes:
            formatted_description = f"[bulk upload] {template_description}"
            success.document_data.description = formatted_description

    # Perform bulk creation
    try:
        created_documents = documents_crud.bulk_create_with_files(db=db, bulk_data=successes)
        successful_uploads = [{
            "filename": doc.name,
            "document_id": str(doc.id),
            "file_id": str(doc.files[0].id),
            "status": "success"
        } for doc in created_documents]

    except Exception as bulk_err:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Bulk creation failed: {str(bulk_err)}")

    # Create error details for the failed uploads
    failed_uploads = [{
        "filename": name,
        "error": err,
        "status": "failed"
    } for name, err in errors]

    return generics_schema.Success(
        message=f"Bulk upload completed: {len(successful_uploads)} successful, {len(failed_uploads)} failed",
        detail={
            "successful_uploads": successful_uploads,
            "failed_uploads": failed_uploads,
            "total_files": len(uploads_data),
            "success_count": len(successful_uploads),
            "error_count": len(failed_uploads)
        }
    )


def add_prompt(db: Session, document_id: UUID, prompt_data: prompts_schema.PromptCreate) -> prompts_schema.Prompt:
    """Add a prompt to a document."""
    # Verify document exists
    if not documents_crud.exist(db=db, id=document_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {str(document_id)!r} not found"
        )
    
    # Set document_id and create prompt
    prompt_data.document_id = document_id
    prompt = prompts_crud.create(db=db, data=prompt_data)
    return prompts_schema.Prompt.model_validate(prompt)


def add_selection(db: Session, document_id: UUID, selection_data: selections_schema.SelectionCreate) -> selections_schema.Selection:
    """Add a selection to a document."""
    # Verify document exists
    if not documents_crud.exist(db=db, id=document_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {str(document_id)!r} not found"
        )
    
    # Set document_id and create selection
    selection_data.document_id = document_id
    selection = selections_crud.create(db=db, data=selection_data)
    return selections_schema.Selection.model_validate(selection)




def update(db: Session, document_id: UUID, document_data: documents_schema.DocumentUpdate) -> documents_schema.Document:
    document = _raise_not_found(documents_crud.update, db=db, id=document_id, data=document_data)
    return documents_schema.Document.model_validate(document)


def delete(db: Session, document_id: UUID) -> generics_schema.Success:
    _raise_not_found(documents_crud.delete, db=db, id=document_id)
    return generics_schema.Success(message=f"Document with ID {str(document_id)!r} deleted successfully")


def summarize(db: Session, document_id: UUID) -> documents_schema.DocumentSummary:
    """Generate a comprehensive summary of a document including all its components."""
    # Get document with all related data
    document = _raise_not_found(
        documents_crud.read, 
        db=db, 
        id=document_id, 
        join_with=["files", "prompts", "selections", "project"]
    )
    
    # File analysis
    original_file = document.original_file
    redacted_file = document.redacted_file
    
    has_original_file = original_file is not None
    has_redacted_file = redacted_file is not None
    original_file_size = original_file.file_size if original_file else None
    redacted_file_size = redacted_file.file_size if redacted_file else None
    total_file_size = (original_file_size or 0) + (redacted_file_size or 0)
        
    # Selection analysis
    ai_selections_count = sum(1 for s in document.selections if s.is_ai_generated)
    manual_selections_count = len(document.selections) - ai_selections_count
    
    # Prompt analysis
    all_languages = []
    temperatures = []
    
    for prompt in document.prompts:
        all_languages.extend(prompt.languages)
        temperatures.append(prompt.temperature)
    
    prompt_languages = list(set(all_languages))  # Unique languages
    average_temperature = sum(temperatures) / len(temperatures) if temperatures else None
    
    return documents_schema.DocumentSummary(
        document_id=document.id,
        name=document.name,
        description=document.description,
        created_at=document.created_at,
        updated_at=document.updated_at,
        project_name=document.project.name,
        project_id=document.project_id,
        has_original_file=has_original_file,
        has_redacted_file=has_redacted_file,
        original_file_size=original_file_size,
        redacted_file_size=redacted_file_size,
        total_file_size=total_file_size,
        prompt_count=len(document.prompts),
        selection_count=len(document.selections),
        tag_count=len(list(set(document.tags))),
        tags=list(set(document.tags)),
        is_processed=has_redacted_file,
        ai_selections_count=ai_selections_count,
        manual_selections_count=manual_selections_count,
        prompt_languages=prompt_languages,
        average_temperature=average_temperature
    )


def process(db: Session, document_id: UUID, password: str) -> generics_schema.Success:
    """Process a document to generate a redacted version.
    
    This method will:
    1. Decrypt the original file using the password
    2. Apply redaction based on prompts and selections
    3. Generate a redacted PDF file (not encrypted)
    4. Store the redacted file with salt=None
    """
    # TODO: Implement the processing pipeline
    # - Verify document exists and has original file
    # - Decrypt original file using password
    # - Apply AI-based redaction using prompts
    # - Apply manual redaction using selections
    # - Generate redacted PDF
    # - Store redacted file with salt=None (unencrypted)
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)
