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
            
            return documents
            
        except Exception as err:
            raise Exception(f"Bulk creation failed: {str(err)}")
    
    def search_shallow(self, db: Session, skip: int = 0, limit: int = 100, order_by: list[tuple[str, str]] | None = None, **kwargs) -> list[tuple["Document", int, int, int, bool, bool]]:
        """Search documents with metadata counts but without loading file, prompt, or selection relationships."""
        from sqlalchemy import func, case
        from backend.db.models import File, Prompt, Selection
        from backend.api.enums import FileType
        
        _sanitized_ordering = (
            getattr(getattr(self.model, field), direction)()
            for field, direction in order_by or []
        )
        _sanitized_filters = (
            self._resolve_filter_operation(field=field, data=data)
            for field, data in kwargs.items()
            if data is not None
        )
        
        results = (
            db.query(
                self.model,
                func.count(File.id).label('file_count'),
                func.count(Prompt.id).label('prompt_count'),
                func.count(Selection.id).label('selection_count'),
                func.sum(case(
                    (File.file_type == FileType.ORIGINAL, 1),
                    else_=0
                )).label('has_original_file'),
                func.sum(case(
                    (File.file_type == FileType.REDACTED, 1),
                    else_=0
                )).label('has_redacted_file')
            )
            .outerjoin(File, self.model.id == File.document_id)
            .outerjoin(Prompt, self.model.id == Prompt.document_id)
            .outerjoin(Selection, self.model.id == Selection.document_id)
            .filter(*_sanitized_filters)
            .group_by(self.model.id)
            .order_by(*_sanitized_ordering)
            .offset(skip)
            .limit(limit)
            .all()
        )
        
        return results
