import base64
import uuid
import pytest
from sqlalchemy.orm import Session

from fastapi import HTTPException, status

from backend.api.controllers import files_controller
from backend.api.schemas.documents_schema import DocumentCreate
from backend.core.security import security_manager
from backend.db.models import Project as ProjectModel, Document as DocumentModel, File as FileModel
from backend.api.enums import FileType


class TestFilesController:
    def _create_project(self, db: Session) -> ProjectModel:
        proj = ProjectModel(
            name=f"proj-{uuid.uuid4().hex[:6]}",
            description="desc",
            contact_name="tester",
            contact_email="tester@example.com",
            password_hash=security_manager.hash_password("StrongPW!123").encode("utf-8"),
        )
        db.add(proj)
        db.commit()
        db.refresh(proj)
        return proj

    def _create_document(self, db: Session, project_id) -> DocumentModel:
        dc = DocumentCreate(name=f"doc-{uuid.uuid4().hex[:6]}.pdf", description=None, project_id=project_id, tags=[])
        doc = DocumentModel(
            name=dc.name,
            description=dc.description,
            project_id=project_id,
            tags=[],
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc

    def _attach_original(self, db: Session, document: DocumentModel, payload: bytes, password: str = "StrongPW!123") -> FileModel:
        encrypted, salt = security_manager.encrypt_data(payload, password)
        f = FileModel(
            file_hash=security_manager.generate_file_hash(payload),
            file_type=FileType.ORIGINAL,
            mime_type="application/pdf",
            data=encrypted,
            salt=salt,
            document_id=document.id,
        )
        db.add(f)
        db.commit()
        db.refresh(f)
        return f

    def _attach_redacted(self, db: Session, document: DocumentModel, payload: bytes) -> FileModel:
        f = FileModel(
            file_hash=security_manager.generate_file_hash(payload),
            file_type=FileType.REDACTED,
            mime_type="application/pdf",
            data=payload,
            salt=None,
            document_id=document.id,
        )
        db.add(f)
        db.commit()
        db.refresh(f)
        return f

    def test_get_and_delete_file(self, test_session: Session):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)
        f = self._attach_redacted(test_session, doc, payload=b"RPDF")

        got = files_controller.get(db=test_session, file_id=f.id)
        assert got.id == f.id

        out = files_controller.delete(db=test_session, file_id=f.id)
        assert "deleted successfully" in out.message

        with pytest.raises(HTTPException) as exc:
            files_controller.get(db=test_session, file_id=f.id)
        assert exc.value.status_code == status.HTTP_404_NOT_FOUND

    def test_download_original_success_and_bad_password(self, test_session: Session, client, monkeypatch):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)
        payload = b"%PDF-1.4 minimal"
        f = self._attach_original(test_session, doc, payload=payload, password="StrongPW!123")

        # Route uses ephemeral decrypt; return correct password
        monkeypatch.setattr(security_manager, "decrypt_with_ephemeral_key", lambda key_id, encrypted_data: "StrongPW!123")
        enc_b64 = base64.b64encode(b"ignored").decode("ascii")
        res = client.post(f"/api/files/id/{f.id}/download", json={
            "key_id": "k",
            "encrypted_password": enc_b64,
            "stream": False,
        })
        assert res.status_code == 200
        assert res.content == payload
        assert "attachment" in res.headers.get("Content-Disposition", "")

        # Wrong password via ephemeral decrypt
        monkeypatch.setattr(security_manager, "decrypt_with_ephemeral_key", lambda key_id, encrypted_data: "WrongPW")
        res2 = client.post(f"/api/files/id/{f.id}/download", json={
            "key_id": "k",
            "encrypted_password": enc_b64,
            "stream": False,
        })
        assert res2.status_code == status.HTTP_401_UNAUTHORIZED

    def test_download_decrypt_failure_and_hash_mismatch(self, test_session: Session, monkeypatch):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)
        payload = b"PLAINTEXT"
        f = self._attach_original(test_session, doc, payload=payload, password="StrongPW!123")

        # Force decrypt failure -> None
        monkeypatch.setattr(security_manager, "decrypt_data", lambda encrypted_data, password, salt: None)
        with pytest.raises(HTTPException) as exc1:
            files_controller.download(db=test_session, file_id=f.id, password="StrongPW!123", stream=False)
        assert exc1.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

        # Restore decrypt to return wrong bytes to cause hash mismatch
        monkeypatch.setattr(security_manager, "decrypt_data", lambda encrypted_data, password, salt: b"WRONG")
        with pytest.raises(HTTPException) as exc2:
            files_controller.download(db=test_session, file_id=f.id, password="StrongPW!123", stream=False)
        assert exc2.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_download_redacted_success_and_stream_headers(self, test_session: Session, client, monkeypatch):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)
        payload = b"RPDF"
        f = self._attach_redacted(test_session, doc, payload=payload)

        # Route uses ephemeral decrypt; return any password that verifies
        monkeypatch.setattr(security_manager, "decrypt_with_ephemeral_key", lambda key_id, encrypted_data: "StrongPW!123")
        enc_b64 = base64.b64encode(b"ignored").decode("ascii")
        res = client.post(f"/api/files/id/{f.id}/download", json={
            "key_id": "k",
            "encrypted_password": enc_b64,
            "stream": True,
        })
        assert res.status_code == 200
        assert res.content == payload
        disp = res.headers.get("Content-Disposition", "")
        assert disp == "inline"
        assert res.headers.get("Cache-Control") == "no-cache, no-store, must-revalidate"
        assert res.headers.get("Pragma") == "no-cache"
        assert res.headers.get("Expires") == "0"

