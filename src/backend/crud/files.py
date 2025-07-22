from uuid import UUID
from sqlalchemy.orm import Session, joinedload

from backend.api.schemas import files_schema
from backend.db.models import File, Document
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
        all_files = (not exclude_original_files and not exclude_obfuscated_files)
        files = (
            db.query(File)
            .order_by(File.filename)
            .options(joinedload(File.document))
            .filter(
                Document.project_id == project_id if project_id else True,
                File.document_id == document_id if document_id else True,
                File.filename.like(filename.replace("*", "%")) if filename else True,
                File.is_original_file != exclude_original_files if not all_files else True,
                File.is_original_file == exclude_obfuscated_files if not all_files else True
            )
            .offset(skip)
            .limit(limit)
            .all()
        )
        return files
    

    def exist_with_original_filename(self, db: Session, project_id: UUID, filename: str) -> bool:
        file = (
            db.query(File)
            .options(joinedload(File.document))
            .filter(
                Document.project_id == project_id if project_id else True,
                File.filename == filename,
                File.is_original_file
            )
            .first()
        )
        return file is not None


    def search_file_type_in_document(self, db: Session, document_id: UUID, is_original_file: bool) -> File:
        file = (
            db.query(File)
            .filter(
                File.document_id == document_id,
                File.is_original_file == is_original_file
            )
            .first()
        )
        return file
