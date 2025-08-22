from __future__ import annotations
from typing import Iterable
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.core.config import settings as app_settings
from backend.crud import projects_crud, ai_settings_crud, documents_crud, selections_crud
from backend.db.models import Selection as SelectionModel
from backend.api.schemas.selections_schema import SelectionCreate
from backend.api.schemas import documents_schema, files_schema
from backend.core.security import security_manager
from backend.api.enums import FileType


class SupportCrud:
    """Cross-cutting helper CRUD for controllers to stay declarative.
    Centralizes common patterns that are not specific to a single model CRUD.
    """

    # ==== Document + Original File helpers ====
    def get_document_or_404(self, db: Session, document_id: UUID, *, join_with: list[str] | None = None):
        return self.get_or_404(
            documents_crud.read,
            entity_name="Document",
            not_found_id=document_id,
            db=db,
            id=document_id,
            **({"join_with": join_with} if join_with else {}),
        )

    def get_original_file_or_error(self, document, *, not_found_status: int = status.HTTP_404_NOT_FOUND):
        # Prefer dedicated accessors if present on model
        original_file = getattr(document, "original_file", None)
        if original_file is None:
            # fallback: scan files if present
            for f in getattr(document, "files", []) or []:
                if getattr(f, "file_type", None) == FileType.ORIGINAL:
                    original_file = f
                    break
        if original_file is None:
            raise HTTPException(
                status_code=not_found_status,
                detail=("No original file found for this document" if not_found_status == status.HTTP_404_NOT_FOUND else "Document has no original file - cannot process"),
            )
        return original_file

    def decrypt_original_file_or_500(self, *, original_file, password: str) -> bytes:
        if getattr(original_file, "salt", None) is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Original file has no encryption salt - data corruption",
            )
        decrypted_data = security_manager.decrypt_data(
            encrypted_data=original_file.data,
            password=password,
            salt=original_file.salt,
        )
        if decrypted_data is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to decrypt file - document may be corrupted",
            )
        # Integrity check
        if security_manager.generate_file_hash(decrypted_data) != original_file.file_hash:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="File integrity verification failed - document may be corrupted",
            )
        return decrypted_data

    def decrypt_password_from_encrypted_request(self, *, encrypted_password_b64: str, key_id: str) -> str:
        import base64
        try:
            encrypted_password_bytes = base64.b64decode(encrypted_password_b64)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid base64-encoded encrypted password: {e}",
            )
        decrypted_password = security_manager.decrypt_with_ephemeral_key(
            key_id=key_id,
            encrypted_data=encrypted_password_bytes,
        )
        if decrypted_password is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to decrypt password. Key may be expired or invalid.",
            )
        return decrypted_password

    def get_decrypted_original_file(self, db: Session, *, document_id: UUID, password: str, join_with: list[str] | None = None, not_found_status: int = status.HTTP_404_NOT_FOUND) -> tuple[object, object, bytes]:
        """Load document, ensure original file exists, decrypt+verify, and return (document, original_file, decrypted_bytes)."""
        document = self.get_document_or_404(db=db, document_id=document_id, join_with=join_with or ["files"])
        original_file = self.get_original_file_or_error(document, not_found_status=not_found_status)
        decrypted_data = self.decrypt_original_file_or_500(original_file=original_file, password=password)
        return document, original_file, decrypted_data

    def get_original_file_data(self, db: Session, *, document_id: UUID, encrypted_password_b64: str, key_id: str, join_with: list[str] | None = None) -> tuple[object, object, bytes]:
        """Load document and original file, decrypt request password, verify project password, decrypt file, and return (document, original_file, decrypted_bytes)."""
        document = self.get_document_or_404(db=db, document_id=document_id, join_with=join_with or ["files"])
        original_file = self.get_original_file_or_error(document)
        decrypted_password = self.decrypt_password_from_encrypted_request(encrypted_password_b64=encrypted_password_b64, key_id=key_id)
        self.verify_project_password_or_401(db=db, project_id=document.project_id, password=decrypted_password)
        decrypted_data = self.decrypt_original_file_or_500(original_file=original_file, password=decrypted_password)
        return document, original_file, decrypted_data

    # ==== Redacted File helpers ====
    def get_redacted_file_or_error(self, document, *, not_found_status: int = status.HTTP_404_NOT_FOUND):
        redacted_file = getattr(document, "redacted_file", None)
        if redacted_file is None:
            for f in getattr(document, "files", []) or []:
                if getattr(f, "file_type", None) == FileType.REDACTED:
                    redacted_file = f
                    break
        if redacted_file is None:
            raise HTTPException(
                status_code=not_found_status,
                detail="No redacted file found for this document",
            )
        return redacted_file

    def read_redacted_file_or_500(self, *, redacted_file) -> bytes:
        if getattr(redacted_file, "salt", None) is not None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Redacted file appears to be encrypted - system error",
            )
        file_data = redacted_file.data
        if security_manager.generate_file_hash(file_data) != redacted_file.file_hash:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="File integrity verification failed - document may be corrupted",
            )
        return file_data

    def get_redacted_file_data(self, db: Session, *, document_id: UUID, join_with: list[str] | None = None) -> tuple[object, object, bytes]:
        document = self.get_document_or_404(db=db, document_id=document_id, join_with=join_with or ["files"])
        redacted_file = self.get_redacted_file_or_error(document, not_found_status=status.HTTP_404_NOT_FOUND)
        file_data = self.read_redacted_file_or_500(redacted_file=redacted_file)
        return document, redacted_file, file_data

    # ==== Shallow list transformation helper ====
    def build_shallow_list_auto(self, records, *, schema_cls, transforms: dict, model_index: int = 0):
        """Build shallow schema instances from search_shallow results.
        
        - Automatically copies fields with identical names from the model to the schema.
        - Only fields listed in 'transforms' require custom mapping.
        - 'records' can be tuples where the model is at model_index.
        """
        items = []
        schema_fields = set(getattr(schema_cls, 'model_fields', {}).keys())
        for rec in records:
            model = rec[model_index] if isinstance(rec, tuple) else rec
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
        """Build a summary schema instance from a model using declarative transforms.
        Fields with identical names are auto-copied from the model; others must be provided via transforms.
        """
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

    # ---- General not-found helpers ----
    def get_or_404(self, callback, *, entity_name: str, not_found_id: UUID | None = None, **kwargs):
        result = callback(**kwargs)
        if result is None:
            detail = (
                f"{entity_name} with ID {str(not_found_id)!r} not found"
                if not_found_id is not None else f"{entity_name} not found"
            )
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
        return result

    def assert_exists_or_404(self, exists: bool, *, entity_name: str, entity_id: UUID) -> None:
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{entity_name} with ID {str(entity_id)!r} not found",
            )

    # ---- Security / Project helpers ----
    def verify_project_password_or_401(self, db: Session, project_id: UUID, password: str) -> None:
        if not projects_crud.verify_password(db=db, id=project_id, password=password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid project password",
            )

    # ---- AI Settings helpers ----
    def ensure_document_ai_settings(self, db: Session, document_id: UUID):
        existing = ai_settings_crud.read_by_document(db=db, document_id=document_id)
        if existing is not None:
            return existing
        # Initialize with sensible defaults from settings
        created = ai_settings_crud.create_default_for_document(db=db, document_id=document_id, defaults={
            "provider": getattr(getattr(app_settings, "ai", object()), "provider", "ollama"),
            "model_name": app_settings.ai.model,
            "temperature": 0.2,
        })
        return created

    def bulk_create_documents_with_files_and_init(self, db: Session, bulk_data) -> list:
        """Wrap bulk doc creation: create docs+files and ensure AiSettings for each."""
        created_documents = documents_crud.bulk_create_with_files(db=db, bulk_data=bulk_data)
        for doc in created_documents:
            self.ensure_document_ai_settings(db=db, document_id=doc.id)
        return created_documents

    # ---- File upload processing ----
    def process_upload(self, db: Session, project_id: UUID, upload_data: files_schema.FileUpload, password: str) -> tuple[str, str] | documents_schema.DocumentBulkUpload:
        existing_filenames = set(documents_crud.get_existing_filenames_in_project(db=db, project_id=project_id))
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

    # ---- Selections helpers (staging lifecycle) ----
    def commit_staged_selections(self, db: Session, document_id: UUID, selection_ids: list[UUID] | None, commit_all: bool) -> list:
        if commit_all:
            db.query(SelectionModel).filter(
                SelectionModel.document_id == document_id,
                SelectionModel.committed == False,
            ).update({"committed": True}, synchronize_session=False)
            db.commit()
        else:
            if not selection_ids:
                return []
            db.query(SelectionModel).filter(
                SelectionModel.document_id == document_id,
                SelectionModel.id.in_(selection_ids),
            ).update({"committed": True}, synchronize_session=False)
            db.commit()
        # Return committed
        committed = [s for s in selections_crud.read_list_by_document(db=db, document_id=document_id) if getattr(s, "committed", False)]
        return committed

    def clear_staged_selections(self, db: Session, document_id: UUID, selection_ids: list[UUID] | None, clear_all: bool) -> int:
        if clear_all:
            deleted = db.query(SelectionModel).filter(
                SelectionModel.document_id == document_id,
                SelectionModel.committed == False,
            ).delete(synchronize_session=False)
            db.commit()
            return int(deleted)
        if not selection_ids:
            return 0
        deleted = db.query(SelectionModel).filter(
            SelectionModel.document_id == document_id,
            SelectionModel.committed == False,
            SelectionModel.id.in_(selection_ids),
        ).delete(synchronize_session=False)
        db.commit()
        return int(deleted)

    def uncommit_selections(self, db: Session, document_id: UUID, selection_ids: list[UUID] | None, uncommit_all: bool) -> list:
        if uncommit_all:
            db.query(SelectionModel).filter(
                SelectionModel.document_id == document_id,
                SelectionModel.committed == True,
            ).update({"committed": False}, synchronize_session=False)
            db.commit()
        else:
            if not selection_ids:
                return []
            db.query(SelectionModel).filter(
                SelectionModel.document_id == document_id,
                SelectionModel.id.in_(selection_ids),
            ).update({"committed": False}, synchronize_session=False)
            db.commit()
        staged = [s for s in selections_crud.read_list_by_document(db=db, document_id=document_id) if not getattr(s, "committed", False)]
        return staged

