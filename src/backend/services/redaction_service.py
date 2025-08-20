from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session

from backend.core.pdf_redactor import PDFRedactor, create_redactor
from backend.crud import files_crud, selections_crud
from backend.db.models import Document, File
from backend.api.enums import FileType


class DocumentRedactionService:
    def __init__(self):
        self.redactor = create_redactor()
    
    def process_document(self, db: Session, document_id: UUID) -> File:
        document = self._get_document_with_files(db, document_id)
        original_file = self._get_original_file(document)
        selections = self._get_document_selections(db, document_id)
        
        if not selections:
            raise ValueError("No selections found for document")
        
        redacted_pdf_data = self.redactor.redact_document(
            original_file.encrypted_data, 
            selections
        )
        
        redacted_file = self._create_redacted_file(
            db, document, original_file, redacted_pdf_data
        )
        
        return redacted_file
    
    def _get_document_with_files(self, db: Session, document_id: UUID) -> Document:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise ValueError("Document not found")
        return document
    
    def _get_original_file(self, document: Document) -> File:
        for file in document.files:
            if file.file_type == FileType.ORIGINAL:
                return file
        raise ValueError("No original file found")
    
    def _get_document_selections(self, db: Session, document_id: UUID) -> List[Dict[str, Any]]:
        selections = selections_crud.read_list_by_document(db, document_id)
        return [
            {
                'x': sel.x,
                'y': sel.y, 
                'width': sel.width,
                'height': sel.height,
                'page_number': sel.page_number
            }
            for sel in selections
        ]
    
    def _create_redacted_file(
        self, 
        db: Session, 
        document: Document, 
        original_file: File, 
        redacted_data: bytes
    ) -> File:
        from backend.api.schemas.files_schema import FileCreate
        
        file_data = FileCreate(
            file_hash=self._calculate_file_hash(redacted_data),
            file_type=FileType.REDACTED,
            mime_type=original_file.mime_type,
            data=redacted_data,
            salt=original_file.salt,
            document_id=document.id
        )
        
        return files_crud.create(db, file_data)
    
    def _calculate_file_hash(self, data: bytes) -> str:
        import hashlib
        return hashlib.sha256(data).hexdigest()


def create_redaction_service() -> DocumentRedactionService:
    return DocumentRedactionService()
