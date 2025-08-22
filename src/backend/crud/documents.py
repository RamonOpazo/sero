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
    
    def search_shallow(self, db: Session, skip: int = 0, limit: int = 100, order_by: list[tuple[str, str]] | None = None, **kwargs) -> list[tuple["Document", int, int, bool]]:
        """Search documents with prompt/selection counts and is_processed flag using efficient subqueries.
        Avoids row multiplication by not joining related tables.
        """
        from sqlalchemy import func, and_, select
        from backend.db.models import File, Prompt, Selection
        from backend.api.enums import FileType
        
        D = self.model
        
        # Ordering
        q_ordered = db.query(D)
        for field, direction in (order_by or []):
            q_ordered = q_ordered.order_by(getattr(getattr(D, field), direction)())
        
        # Filters
        _sanitized_filters = [
            self._resolve_filter_operation(field=field, data=data)
            for field, data in kwargs.items()
            if data is not None
        ]
        if _sanitized_filters:
            q_ordered = q_ordered.filter(*_sanitized_filters)
        
        # Correlated subqueries using select().scalar_subquery() for SA 1.4+/2.0
        prompt_count_sq = (
            select(func.count(Prompt.id))
            .where(Prompt.document_id == D.id)
            .correlate(D)
            .scalar_subquery()
        )
        selection_count_sq = (
            select(func.count(Selection.id))
            .where(Selection.document_id == D.id)
            .correlate(D)
            .scalar_subquery()
        )
        redacted_count_sq = (
            select(func.count(File.id))
            .where(and_(File.document_id == D.id, File.file_type == FileType.REDACTED))
            .correlate(D)
            .scalar_subquery()
        )
        is_processed_expr = (redacted_count_sq > 0)
        
        results = (
            db.query(
                D,
                prompt_count_sq.label('prompt_count'),
                selection_count_sq.label('selection_count'),
                is_processed_expr.label('is_processed'),
            )
            .filter(D.id.in_(q_ordered.with_entities(D.id)))
            .offset(skip)
            .limit(limit)
            .all()
        )
        
        return results
