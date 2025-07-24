from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from loguru import logger
import pymupdf

from backend.crud import documents_crud, files_crud
from backend.api.schemas import documents_schema, generics_schema, files_schema
from backend.api.enums import DocumentStatus
from backend.core.redactor import PDFRedactor, RedactionConfig, CropBorder, PDFRedactionError
from backend.core.security import security_manager


def get(db: Session, document_id: UUID) -> documents_schema.Document:
    document = documents_crud.read_with_backrefs(db=db, document_id=document_id)
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {str(document_id)!r} not found",
        )
    
    return documents_schema.Document.model_validate(document)


def get_list(db: Session, skip: int, limit: int) -> list[documents_schema.Document]:
    documents = documents_crud.search_list(db=db, skip=skip, limit=limit, status=None, project_id=None)
    return [ documents_schema.Document.model_validate(i) for i in documents ]


def search_list(db: Session, skip: int, limit: int, status: DocumentStatus | None, project_id: UUID | None) -> list[documents_schema.Document]:
    documents = documents_crud.search_list(db=db, skip=skip, limit=limit, status=status, project_id=project_id)
    return [ documents_schema.Document.model_validate(i) for i in documents ]


def create(db: Session, document_data: documents_schema.DocumentCreate) -> documents_schema.Document:
    document = documents_crud.create(db=db, data=document_data)
    return documents_schema.Document.model_validate(document)


def update(db: Session, document_id: UUID, document_data: documents_schema.DocumentUpdate) -> documents_schema.Document:
    document = documents_crud.read(db=db, id=document_id)
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {str(document_id)!r} not found",
        )

    updated_document = documents_crud.update(db=db, id=document_id, data=document_data)
    return documents_schema.Document.model_validate(updated_document)


def update_status(db: Session, document_id: UUID, status: DocumentStatus) -> documents_schema.Document:
    document_data = documents_schema.DocumentUpdate(status=status)
    document = update(db=db, document_id=document_id, document_data=document_data)
    return document


def delete(db: Session, document_id: UUID) -> generics_schema.Success:
    if not documents_crud.exist(db=db, id=document_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {str(document_id)!r} not found",
        )

    documents_crud.delete(db, id=document_id)
    return generics_schema.Success(message=f"Document with ID {str(document_id)!r} deleted successfully")


def summarize(db: Session, document_id: UUID) -> generics_schema.Success:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)


def process(db: Session, document_id: UUID) -> generics_schema.Success:
    """
    Process a document by applying redactions based on selections and creating an obfuscated file.
    
    This function:
    1. Retrieves the document and its original file
    2. Gets all selections associated with the original file
    3. Converts selections to PDF redaction areas
    4. Creates a redacted PDF using the PDF redactor
    5. Saves the redacted PDF as an obfuscated file
    
    Args:
        db: Database session
        document_id: UUID of the document to process
        
    Returns:
        Success message with processing details
        
    Raises:
        HTTPException: If document not found, no original file, or processing fails
    """
    try:
        logger.info(f"Starting document processing for document ID: {document_id}")
        
        # Get the document with all related data
        document = documents_crud.read_with_backrefs(db=db, document_id=document_id)
        if document is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID {str(document_id)!r} not found"
            )
        
        # Get the original file
        original_file = document.original_file
        if original_file is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Document {str(document_id)!r} has no original file to process"
            )
        
        # Check if obfuscated file already exists
        existing_obfuscated = document.obfuscated_file
        if existing_obfuscated is not None:
            logger.warning(f"Document {document_id} already has an obfuscated file. Recreating.")
            # Delete existing obfuscated file
            files_crud.delete(db=db, id=existing_obfuscated.id)
        
        # Get all selections associated with the original file
        selections = original_file.selections
        if not selections:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Document {str(document_id)!r} has no selections to process"
            )
        
        logger.info(f"Found {len(selections)} selections to process for document {document_id}")
        
        # Convert selections to redaction areas and apply redactions
        redacted_pdf_data, extracted_text, redaction_uuid = _apply_selection_based_redactions(
            original_file.data, selections, original_file.filename or f"{document_id}.pdf"
        )
        
        # Create obfuscated file with redacted PDF
        obfuscated_filename = _generate_obfuscated_filename(original_file.filename, redaction_uuid)
        file_hash = security_manager.generate_file_hash(redacted_pdf_data)
        
        # Create file data for the obfuscated file
        obfuscated_file_data = files_schema.FileCreate(
            filename=obfuscated_filename,
            mime_type=original_file.mime_type,
            data=redacted_pdf_data,
            is_original_file=False,  # This is the obfuscated file
            salt=original_file.salt,  # Reuse the same salt
            file_hash=file_hash,
            document_id=document_id
        )
        
        # Save the obfuscated file
        obfuscated_file = files_crud.create(db=db, data=obfuscated_file_data)
        
        # Update document status to processed
        update_status(db=db, document_id=document_id, status=DocumentStatus.PROCESSED)
        
        logger.info(f"Document processing completed successfully for document {document_id}. "
                   f"Created obfuscated file {obfuscated_file.id} with redaction UUID {redaction_uuid}")
        
        return generics_schema.Success(
            message=f"Document processed successfully",
            detail={
                "document_id": str(document_id),
                "original_file_id": str(original_file.id),
                "obfuscated_file_id": str(obfuscated_file.id),
                "redaction_uuid": str(redaction_uuid),
                "selections_processed": len(selections),
                "extracted_text_length": len(extracted_text),
                "status": "processed"
            }
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Failed to process document {document_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document processing failed: {str(e)}"
        )


def _apply_selection_based_redactions(pdf_data: bytes, selections: list, filename: str) -> tuple[bytes, str, UUID]:
    """
    Apply redactions to a PDF based on selection areas.
    
    Args:
        pdf_data: Original PDF data as bytes
        selections: List of Selection objects defining areas to redact
        filename: Original filename for logging
        
    Returns:
        Tuple of (redacted_pdf_data, extracted_text, redaction_uuid)
        
    Raises:
        PDFRedactionError: If redaction fails
    """
    try:
        logger.info(f"Applying selection-based redactions to {filename}")
        
        # Open the PDF to get page dimensions for coordinate conversion
        doc = pymupdf.open("pdf", pdf_data)
        
        if doc.page_count == 0:
            raise PDFRedactionError("PDF contains no pages")
        
        # Extract text from all selection areas before redaction
        extracted_text_parts = []
        
        # Group selections by page for efficient processing
        selections_by_page = {}
        for selection in selections:
            page_num = selection.page_number or 1  # Default to page 1 if None
            if page_num not in selections_by_page:
                selections_by_page[page_num] = []
            selections_by_page[page_num].append(selection)
        
        # Generate unique redaction UUID
        from uuid import uuid4
        redaction_uuid = uuid4()
        
        # Process each page with selections
        total_redacted_areas = 0
        
        for page_num, page_selections in selections_by_page.items():
            if page_num > doc.page_count:
                logger.warning(f"Selection references page {page_num} but PDF only has {doc.page_count} pages")
                continue
                
            page = doc.load_page(page_num - 1)  # Convert to 0-based indexing
            page_rect = page.rect
            
            logger.debug(f"Processing {len(page_selections)} selections on page {page_num}")
            
            for selection in page_selections:
                # Convert normalized coordinates (0-1) to actual PDF coordinates
                rect = _convert_selection_to_pdf_rect(selection, page_rect)
                
                # Extract text from this area before redaction
                text = page.get_text("text", clip=rect)
                if text.strip():
                    extracted_text_parts.append(f"[Page {page_num}] {text.strip()}")
                
                # Add redaction annotation
                page.add_redact_annot(rect)
                total_redacted_areas += 1
            
            # Apply redactions to this page
            page.apply_redactions()
            
            # Insert redaction marker
            marker_text = f"SERO REDACTED: {redaction_uuid}"
            page.insert_text(
                (50, 50),  # Position for marker
                marker_text,
                fontsize=10,
                color=(1.0, 0.0, 0.0)  # Red color
            )
        
        # Get the redacted PDF data
        redacted_pdf_data = doc.write()
        doc.close()
        
        # Combine extracted text
        extracted_text = "\n".join(extracted_text_parts)
        
        logger.info(f"Successfully applied {total_redacted_areas} redactions to {filename}. "
                   f"Redaction UUID: {redaction_uuid}")
        
        return redacted_pdf_data, extracted_text, redaction_uuid
        
    except Exception as e:
        logger.error(f"Failed to apply redactions to {filename}: {str(e)}")
        raise PDFRedactionError(f"Redaction failed: {str(e)}")


def _convert_selection_to_pdf_rect(selection, page_rect: pymupdf.Rect) -> pymupdf.Rect:
    """
    Convert a normalized selection (0-1 coordinates) to actual PDF rectangle.
    
    Args:
        selection: Selection object with normalized coordinates (0-1)
        page_rect: PyMuPDF page rectangle with actual dimensions
        
    Returns:
        PyMuPDF Rect object with actual PDF coordinates
    """
    # Convert normalized coordinates to actual PDF coordinates
    x0 = page_rect.x0 + (selection.x * page_rect.width)
    y0 = page_rect.y0 + (selection.y * page_rect.height)
    x1 = x0 + (selection.width * page_rect.width)
    y1 = y0 + (selection.height * page_rect.height)
    
    return pymupdf.Rect(x0, y0, x1, y1)


def _generate_obfuscated_filename(original_filename: str | None, redaction_uuid: UUID) -> str:
    """
    Generate filename for obfuscated file.
    
    Args:
        original_filename: Original file name (may be None)
        redaction_uuid: UUID of the redaction operation
        
    Returns:
        Generated filename for obfuscated file
    """
    if original_filename:
        # Remove extension and add redaction suffix
        name_part = original_filename.rsplit('.', 1)[0]
        return f"{name_part}_redacted_{str(redaction_uuid)[:8]}.pdf"
    else:
        return f"redacted_{str(redaction_uuid)[:8]}.pdf"
