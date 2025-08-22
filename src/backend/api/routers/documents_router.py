from uuid import UUID
from fastapi import APIRouter, Depends, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.core.database import get_db_session
from backend.api.schemas import documents_schema, generics_schema, files_schema, prompts_schema, selections_schema
from backend.api.controllers import documents_controller


router = APIRouter()


@router.get("", response_model=list[documents_schema.Document])
async def list_documents(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session)
):
    """Get paginated list of all documents."""
    return documents_controller.get_list(db=db, skip=skip, limit=limit)


@router.get("/shallow", response_model=list[documents_schema.DocumentShallow])
async def list_documents_shallow(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session)
):
    """Get paginated shallow list of documents without file, prompt, or selection data for efficient listing."""
    return documents_controller.get_shallow_list(db=db, skip=skip, limit=limit)


@router.get("/search", response_model=list[documents_schema.Document])
async def search_documents(
    skip: int = 0,
    limit: int = 100,
    name: str | None = None,
    project_id: UUID | None = None,
    db: Session = Depends(get_db_session)
):
    """Search documents with filters."""
    return documents_controller.search_list(
        db=db, skip=skip, limit=limit, name=name, project_id=project_id
    )


@router.post("", response_model=documents_schema.Document)
async def create_document(
    document_data: documents_schema.DocumentCreate,
    db: Session = Depends(get_db_session)
):
    """Create a new document without files."""
    return documents_controller.create(db=db, document_data=document_data)


@router.post("/upload", response_model=documents_schema.Document)
async def create_document_with_file(
    project_id: UUID = Form(...),
    file: UploadFile = File(...),
    description: str | None = Form(None),
    password: str = Form(...),
    db: Session = Depends(get_db_session)
):
    """Create a document with an associated file upload."""
    upload_data = files_schema.FileUpload(
        project_id=project_id,
        file=file,
        description=description
    )
    return documents_controller.create_with_file(db=db, upload_data=upload_data, password=password)


@router.post("/bulk-upload", response_model=generics_schema.Success)
async def bulk_upload_documents(
    project_id: UUID = Form(...),
    files: list[UploadFile] = File(...),
    template_description: str | None = Form(None),
    password: str = Form(...),
    db: Session = Depends(get_db_session)
):
    """Bulk upload multiple documents to a project."""
    uploads_data = [
        files_schema.FileUpload(
            project_id=project_id,
            file=file,
            description=None
        )
        for file in files
    ]
    return documents_controller.bulk_create_with_files(
        db=db, 
        uploads_data=uploads_data, 
        password=password, 
        template_description=template_description
    )


@router.get("/id/{document_id}", response_model=documents_schema.Document)
async def get_document(
    document_id: UUID,
    db: Session = Depends(get_db_session)
):
    """Get a single document by ID."""
    return documents_controller.get(db=db, document_id=document_id)


@router.get("/id/{document_id}/shallow", response_model=documents_schema.DocumentShallow)
async def get_document_shallow(
    document_id: UUID,
    db: Session = Depends(get_db_session)
):
    """Get a single shallow document by ID including counts and processed flag."""
    return documents_controller.get_shallow(db=db, document_id=document_id)


@router.put("/id/{document_id}", response_model=documents_schema.Document)
async def update_document(
    document_id: UUID,
    document_data: documents_schema.DocumentUpdate,
    db: Session = Depends(get_db_session)
):
    """Update a document."""
    return documents_controller.update(db=db, document_id=document_id, document_data=document_data)


@router.delete("/id/{document_id}", response_model=generics_schema.Success)
async def delete_document(
    document_id: UUID,
    db: Session = Depends(get_db_session)
):
    """Delete a document."""
    return documents_controller.delete(db=db, document_id=document_id)


@router.get("/id/{document_id}/summary", response_model=documents_schema.DocumentSummary)
async def summarize_document(
    document_id: UUID,
    db: Session = Depends(get_db_session)
):
    """Get comprehensive summary of a document."""
    return documents_controller.summarize(db=db, document_id=document_id)


@router.get("/id/{document_id}/tags", response_model=list[str])
async def get_document_tags(
    document_id: UUID,
    db: Session = Depends(get_db_session)
):
    """Get tags for a document."""
    return documents_controller.get_tags(db=db, document_id=document_id)




@router.get("/id/{document_id}/ai-settings", response_model=documents_schema.DocumentAiSettings)
async def get_document_ai_settings(
    document_id: UUID,
    db: Session = Depends(get_db_session)
):
    """Get AI settings for a document."""
    return documents_controller.get_ai_settings(db=db, document_id=document_id)


@router.put("/id/{document_id}/ai-settings", response_model=documents_schema.DocumentAiSettings)
async def update_document_ai_settings(
    document_id: UUID,
    data: documents_schema.DocumentAiSettingsUpdate,
    db: Session = Depends(get_db_session)
):
    """Update AI settings for a document."""
    return documents_controller.update_ai_settings(db=db, document_id=document_id, data=data)


@router.get("/id/{document_id}/prompts", response_model=list[prompts_schema.Prompt])
async def get_document_prompts(
    document_id: UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session)
):
    """Get prompts for a document."""
    return documents_controller.get_prompts(db=db, document_id=document_id, skip=skip, limit=limit)


@router.post("/id/{document_id}/prompts", response_model=prompts_schema.Prompt)
async def add_prompt_to_document(
    document_id: UUID,
    prompt_data: prompts_schema.PromptCreate,
    db: Session = Depends(get_db_session)
):
    """Add a prompt to a document."""
    return documents_controller.add_prompt(db=db, document_id=document_id, prompt_data=prompt_data)


@router.get("/id/{document_id}/selections", response_model=list[selections_schema.Selection])
async def get_document_selections(
    document_id: UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_session)
):
    """Get selections for a document."""
    return documents_controller.get_selections(db=db, document_id=document_id, skip=skip, limit=limit)


@router.post("/id/{document_id}/selections", response_model=selections_schema.Selection)
async def add_selection_to_document(
    document_id: UUID,
    selection_data: selections_schema.SelectionCreate,
    db: Session = Depends(get_db_session)
):
    """Add a selection to a document."""
    return documents_controller.add_selection(db=db, document_id=document_id, selection_data=selection_data)


@router.post("/id/{document_id}/ai/apply", response_model=list[selections_schema.Selection])
async def apply_ai(
    document_id: UUID,
    db: Session = Depends(get_db_session),
):
    """Apply AI to generate staged selections (committed=False)."""
    return documents_controller.apply_ai_and_stage(db=db, document_id=document_id)


@router.patch("/id/{document_id}/selections/commit", response_model=list[selections_schema.Selection])
async def commit_staged_selections(
    document_id: UUID,
    request: selections_schema.SelectionCommitRequest,
    db: Session = Depends(get_db_session),
):
    """Commit staged selections for a document (by IDs or all)."""
    return documents_controller.commit_staged_selections(db=db, document_id=document_id, request=request)


@router.post("/id/{document_id}/process", response_model=generics_schema.Success)
async def process_document(
    document_id: UUID,
    password: str = Form(...),
    db: Session = Depends(get_db_session)
):
    """Process a document to generate redacted version."""
    return documents_controller.process(db=db, document_id=document_id, password=password)


@router.post("/id/{document_id}/download/original", response_class=StreamingResponse)
async def download_original_file(
    document_id: UUID,
    request: files_schema.EncryptedFileDownloadRequest,
    db: Session = Depends(get_db_session)
) -> StreamingResponse:
    """Download the original file for a document using encrypted password.
    
    This endpoint provides document-centric file access without requiring
    separate file ID lookups. Original files are encrypted and require
    password verification.
    
    Args:
        document_id: UUID of the document
        request: Contains encrypted password and key metadata
        db: Database session
        
    Returns:
        StreamingResponse: The decrypted original file
        
    Raises:
        HTTPException: If document not found, no original file, or invalid password
    """
    return documents_controller.download_original_file(
        db=db, 
        document_id=document_id, 
        request=request
    )


@router.get("/id/{document_id}/download/redacted", response_class=StreamingResponse)
async def download_redacted_file(
    document_id: UUID,
    db: Session = Depends(get_db_session)
) -> StreamingResponse:
    """Download the redacted file for a document.
    
    This endpoint provides direct access to redacted files without password
    requirements since redacted files are not encrypted.
    
    Args:
        document_id: UUID of the document
        db: Database session
        
    Returns:
        StreamingResponse: The redacted file
        
    Raises:
        HTTPException: If document not found or no redacted file exists
    """
    return documents_controller.download_redacted_file(
        db=db, 
        document_id=document_id
    )
