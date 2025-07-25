from uuid import UUID
from sqlalchemy.orm import Session

from backend.db.models import Document
from backend.api.schemas import documents_schema
from backend.crud.base import BaseCrud



class DocumentCrud(BaseCrud[Document, documents_schema.DocumentCreate, documents_schema.DocumentUpdate]):
    
    def get_existing_filenames_in_project(self, db: Session, project_id: UUID) -> set[str]:
        """Get all existing document names (used as filenames) in a project."""
        documents = self.search(
            db=db,
            skip=0,
            limit=10000,  # Reasonable limit for most projects
            project_id=project_id
        )
        
        return {doc.name for doc in documents}
    
    def bulk_create_with_files(self, db: Session, bulk_data: list[documents_schema.DocumentBulkUpload]) -> list[Document]:
        """Bulk create documents with their associated files in a single transaction."""
        if not bulk_data:
            return []
        
        documents = []
        
        try:
            db.begin()
            
            for data in bulk_data:
                # Create document
                document = self.create(db=db, data=data.document_data)
                
                # Create associated file
                from backend.crud import files_crud
                file_data_with_doc_id = data.file_data.model_copy(
                    update={"document_id": document.id}
                )
                files_crud.create(db=db, data=file_data_with_doc_id)
                
                documents.append(document)
            
            db.commit()
            return documents
            
        except Exception as err:
            db.rollback()
            raise Exception(f"Bulk creation failed: {str(err)}")
