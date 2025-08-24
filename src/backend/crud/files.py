from uuid import UUID
from sqlalchemy.orm import Session, joinedload

from backend.api.schemas import files_schema
from backend.db.models import File, Document
from backend.api.enums import FileType
from backend.crud.base import BaseCrud


class FileCrud(BaseCrud[File, files_schema.FileCreate, files_schema.FileUpdate]):
    def search_list(
        self,
        db: Session,
        skip: int,
        limit: int,
        project_id: UUID | None,
        document_id: UUID | None,
        filename: str | None,
        exclude_original_files: bool,
        exclude_obfuscated_files: bool,
    ) -> list[File]:
        """Search files with optional filters.
        - filename filter applies to Document.name (no filename column on File)
        - original vs redacted determined by File.file_type
        """
        q = (
            db.query(File)
            .join(Document, File.document_id == Document.id)
            .options(joinedload(File.document))
        )
        # Filters
        if project_id:
            q = q.filter(Document.project_id == project_id)
        if document_id:
            q = q.filter(File.document_id == document_id)
        if filename:
            q = q.filter(Document.name.like(filename.replace("*", "%")))
        # File type exclusions
        if exclude_original_files:
            q = q.filter(File.file_type != FileType.ORIGINAL)
        if exclude_obfuscated_files:
            q = q.filter(File.file_type != FileType.REDACTED)
        # Ordering: by Document.name asc, then created_at desc when present
        q = q.order_by(Document.name.asc())
        files = q.offset(skip).limit(limit).all()
        return files
    

    def exist_with_original_filename(self, db: Session, project_id: UUID, filename: str) -> bool:
        """Check if a document with given name in project has an ORIGINAL file."""
        file = (
            db.query(File)
            .join(Document, File.document_id == Document.id)
            .options(joinedload(File.document))
            .filter(
                Document.project_id == project_id,
                Document.name == filename,
                File.file_type == FileType.ORIGINAL,
            )
            .first()
        )
        return file is not None


    def search_file_type_in_document(self, db: Session, document_id: UUID, is_original_file: bool) -> File | None:
        target_type = FileType.ORIGINAL if is_original_file else FileType.REDACTED
        file = (
            db.query(File)
            .filter(
                File.document_id == document_id,
                File.file_type == target_type,
            )
            .first()
        )
        return file
