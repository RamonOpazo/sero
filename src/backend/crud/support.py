from __future__ import annotations
from uuid import UUID
from base64 import b64decode
from typing import Callable
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.core.config import settings as app_settings
from backend.db.models import Selection as SelectionModel, Project as ProjectModel, Document as DocumentModel, File as FileModel, AiSettings as AiSettingsModel
from backend.api.schemas import documents_schema, files_schema
from backend.service.crypto_service import get_security_service
from backend.core.security import security_manager
from backend.api.enums import FileType, CommitState
from backend.crud.projects import ProjectCrud
from backend.crud.documents import DocumentCrud
from backend.crud.selections import SelectionCrud
from backend.crud.ai_settings import AiSettingsCrud


class SupportCrud:
    """Cross-cutting helper CRUD for controllers to stay declarative."""
    def __init__(self) -> None:
        # Instantiate CRUDs locally to avoid importing package singletons (prevents circular imports)
        self.projects_crud = ProjectCrud(ProjectModel)
        self.documents_crud = DocumentCrud(DocumentModel)
        self.selections_crud = SelectionCrud(SelectionModel)
        self.ai_settings_crud = AiSettingsCrud(AiSettingsModel)


    def apply_or_404[T](self, crud_method: Callable[..., T], *, db: Session, id: UUID, **kwargs) -> T:
        """Call the given CRUD method with db and id; if it returns None, raise 404."""
        kwargs.setdefault("db", db)
        kwargs.setdefault("id", id)
        result = crud_method(**kwargs)
        if result is None:
            # Infer entity name from bound CRUD instance's model
            bound_self = getattr(crud_method, "__self__", None)
            model = getattr(bound_self, "model", None)
            entity_name = getattr(model, "__name__", None) or "Entity"
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{entity_name} with ID {str(id)!r} not found",
            )
        return result


    def _get_redacted_file_or_404(self, document: DocumentModel) -> FileModel:
        redacted_file = document.redacted_file
        if redacted_file is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No redacted file found for this document",
            )
        return redacted_file
    

    def _read_redacted_file_or_500(self, *, redacted_file: FileModel) -> bytes:
        if redacted_file.salt is not None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Redacted file appears to be encrypted; system error",
            )
        file_data = redacted_file.data
        if security_manager.generate_file_hash(file_data) != redacted_file.file_hash:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="File integrity verification failed; document may be corrupted",
            )
        return file_data
    

    def _get_original_file_or_404(self, document: DocumentModel) -> FileModel:
        original_file = document.original_file
        if original_file is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No original file found for this document",
            )
        return original_file
    

    def _decrypt_original_file_or_500(self, *, original_file: FileModel, password: str) -> bytes:
        if original_file.salt is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Original file has no encryption salt; data corruption",
            )
        decrypted_data = security_manager.decrypt_data(
            encrypted_data=original_file.data,
            password=password,
            salt=original_file.salt,
        )
        if decrypted_data is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to decrypt file; document may be corrupted",
            )
        if security_manager.generate_file_hash(decrypted_data) != original_file.file_hash:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="File integrity verification failed; document may be corrupted",
            )
        return decrypted_data


    def _decrypt_password_or_400(self, *, encrypted_password_b64: str, key_id: str) -> str:
        try:
            encrypted_password_bytes = b64decode(encrypted_password_b64)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid base64-encoded encrypted password: {e}",
            )
        decrypted_password = get_security_service().decrypt_with_ephemeral_key(
            key_id=key_id,
            encrypted_data=encrypted_password_bytes,
        )
        if decrypted_password is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to decrypt password. Key may be expired or invalid.",
            )
        return decrypted_password


    def get_original_file_data_or_400_401_404_500(
        self,
        db: Session,
        *,
        document_or_id: DocumentModel | UUID,
        encrypted_password_b64: str,
        key_id: str,
        join_with: list[str] | None = None,
    ) -> tuple[DocumentModel, FileModel, bytes]:
        """Load (or use provided) document and original file, decrypt request password, verify project password, decrypt file, and return (document, original_file, decrypted_bytes)."""
        doc = document_or_id if isinstance(document_or_id, DocumentModel) else self.apply_or_404(self.documents_crud.read, db=db, id=document_or_id, join_with=join_with or ["files"])
        original_file = self._get_original_file_or_404(doc)
        decrypted_password = self._decrypt_password_or_400(encrypted_password_b64=encrypted_password_b64, key_id=key_id)
        self.verify_project_password_or_401(db=db, project_id=doc.project_id, password=decrypted_password)
        decrypted_data = self._decrypt_original_file_or_500(original_file=original_file, password=decrypted_password)
        return doc, original_file, decrypted_data


    def get_redacted_file_data_or_404_500(
        self,
        db: Session,
        *,
        document_id: UUID,
        join_with: list[str] | None = None,
    ) -> tuple[DocumentModel, FileModel, bytes]:
        document = self.apply_or_404(self.documents_crud.read, db=db, id=document_id, join_with=join_with or ["files"])
        redacted_file = self._get_redacted_file_or_404(document)
        file_data = self._read_redacted_file_or_500(redacted_file=redacted_file)
        return document, redacted_file, file_data


    def build_shallow_list(self, records, *, schema_cls, transforms: dict, model_index: int = 0):
        """Build shallow schema instances from search_shallow results."""
        items = []
        schema_fields = set(getattr(schema_cls, 'model_fields', {}).keys())
        for rec in records:
            # Handle SQLAlchemy Row/RowMapping or tuple
            try:
                candidate = rec[model_index]  # works for tuples and SA Rows
            except Exception:
                candidate = rec
            model = candidate

            data = {}
            # First, apply explicit transforms
            for key, fn in (transforms or {}).items():
                data[key] = fn({"record": rec, "model": model})
            # Then, auto-map remaining matching fields from the model
            for field in schema_fields - set((transforms or {}).keys()):
                if hasattr(model, field):
                    data[field] = getattr(model, field)
            items.append(schema_cls.model_validate(data))
        return items


    def build_summary(self, *, schema_cls, model, transforms: dict):
        """Build a summary schema instance from a model using declarative transforms."""
        schema_fields = set(getattr(schema_cls, 'model_fields', {}).keys())
        data = {}
        # Apply explicit transforms
        for key, fn in (transforms or {}).items():
            data[key] = fn({"model": model})
        # Auto-map remaining fields
        for field in schema_fields - set((transforms or {}).keys()):
            if hasattr(model, field):
                data[field] = getattr(model, field)
        return schema_cls.model_validate(data)


    def verify_project_password_or_401(self, db: Session, project_id: UUID, password: str) -> None:
        project = self.apply_or_404(self.projects_crud.read, db=db, id=project_id)
        is_password_verified = security_manager.verify_password(plain_password=password, hashed_password=project.password_hash)
        if not is_password_verified:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid project password",
            )


    def ensure_project_ai_settings(self, db: Session, project_id: UUID):
        existing = self.ai_settings_crud.read_by_project(db=db, project_id=project_id)
        if existing is not None:
            return existing
        # Initialize with sensible defaults from settings
        created = self.ai_settings_crud.create_default_for_project(db=db, project_id=project_id, defaults={
            "provider": getattr(getattr(app_settings, "ai", object()), "provider", "ollama"),
            "model_name": app_settings.ai.model,
            "temperature": 0.2,
        })
        return created
    

    def bulk_create_documents_with_files_and_init(self, db: Session, bulk_data) -> list:
        """Wrap bulk doc creation: create docs+files and ensure AiSettings for each project."""
        created_documents = self.documents_crud.bulk_create_with_files(db=db, bulk_data=bulk_data)
        for doc in created_documents:
            self.ensure_project_ai_settings(db=db, project_id=doc.project_id)
        return created_documents


    def process_upload(self, db: Session, project_id: UUID, upload_data: files_schema.FileUpload, password: str) -> tuple[str, str] | documents_schema.DocumentBulkUpload:
        existing_filenames = set(self.documents_crud.get_existing_filenames_in_project(db=db, project_id=project_id))
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
                document_id=None,
            )
            document_data = documents_schema.DocumentCreate(name=safe_filename, project_id=project_id, description=upload_data.description)
        except Exception as err:
            return upload_data.file.filename, f"Error: {str(err)}"
        return documents_schema.DocumentBulkUpload(document_data=document_data, file_data=file_data)


    def commit_staged_selections(self, db: Session, document_id: UUID, selection_ids: list[UUID] | None, commit_all: bool) -> list:
        if commit_all:
            db.query(SelectionModel).filter(
                SelectionModel.document_id == document_id,
                SelectionModel.state == CommitState.STAGED,
            ).update({"state": CommitState.COMMITTED}, synchronize_session=False)
            db.commit()
        else:
            if not selection_ids:
                return []
            db.query(SelectionModel).filter(
                SelectionModel.document_id == document_id,
                SelectionModel.id.in_(selection_ids),
            ).update({"state": CommitState.COMMITTED}, synchronize_session=False)
            db.commit()
        # Return committed
        committed = [s for s in self.selections_crud.read_list_by_document(db=db, document_id=document_id) if getattr(s, "state", None) == CommitState.COMMITTED]
        return committed


    def clear_staged_selections(self, db: Session, document_id: UUID, selection_ids: list[UUID] | None, clear_all: bool) -> int:
        if clear_all:
            deleted = db.query(SelectionModel).filter(
                SelectionModel.document_id == document_id,
                SelectionModel.state == CommitState.STAGED,
            ).delete(synchronize_session=False)
            db.commit()
            return int(deleted)
        if not selection_ids:
            return 0
        deleted = db.query(SelectionModel).filter(
            SelectionModel.document_id == document_id,
            SelectionModel.state == CommitState.STAGED,
            SelectionModel.id.in_(selection_ids),
        ).delete(synchronize_session=False)
        db.commit()
        return int(deleted)


    def uncommit_selections(self, db: Session, document_id: UUID, selection_ids: list[UUID] | None, uncommit_all: bool) -> list:
        if uncommit_all:
            db.query(SelectionModel).filter(
                SelectionModel.document_id == document_id,
                SelectionModel.state == CommitState.COMMITTED,
            ).update({"state": CommitState.STAGED}, synchronize_session=False)
            db.commit()
        else:
            if not selection_ids:
                return []
            db.query(SelectionModel).filter(
                SelectionModel.document_id == document_id,
                SelectionModel.id.in_(selection_ids),
            ).update({"state": CommitState.STAGED}, synchronize_session=False)
            db.commit()
        staged = [s for s in self.selections_crud.read_list_by_document(db=db, document_id=document_id) if s.state == CommitState.STAGED]
        return staged
