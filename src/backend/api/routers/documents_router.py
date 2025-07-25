from uuid import UUID
from fastapi import APIRouter, Depends, File, UploadFile, Form
from sqlalchemy.orm import Session

from backend.core.database import get_db_session
from backend.api.enums import DocumentStatus
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


@router.get("/search", response_model=list[documents_schema.Document])
async def search_documents(
    skip: int = 0,
    limit: int = 100,
    name: str | None = None,
    status: DocumentStatus | None = None,
    project_id: UUID | None = None,
    db: Session = Depends(get_db_session)
):
    """Search documents with filters."""
    return documents_controller.search_list(
        db=db, skip=skip, limit=limit, name=name, status=status, project_id=project_id
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


@router.post("/id/{document_id}/prompts", response_model=prompts_schema.Prompt)
async def add_prompt_to_document(
    document_id: UUID,
    prompt_data: prompts_schema.PromptCreate,
    db: Session = Depends(get_db_session)
):
    """Add a prompt to a document."""
    return documents_controller.add_prompt(db=db, document_id=document_id, prompt_data=prompt_data)


@router.post("/id/{document_id}/selections", response_model=selections_schema.Selection)
async def add_selection_to_document(
    document_id: UUID,
    selection_data: selections_schema.SelectionCreate,
    db: Session = Depends(get_db_session)
):
    """Add a selection to a document."""
    return documents_controller.add_selection(db=db, document_id=document_id, selection_data=selection_data)


@router.post("/id/{document_id}/process", response_model=generics_schema.Success)
async def process_document(
    document_id: UUID,
    password: str = Form(...),
    db: Session = Depends(get_db_session)
):
    """Process a document to generate redacted version."""
    return documents_controller.process(db=db, document_id=document_id, password=password)
