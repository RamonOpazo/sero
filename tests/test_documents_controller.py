import base64
import uuid
import pytest
from sqlalchemy.orm import Session

from fastapi import HTTPException, status

from backend.api.controllers import documents_controller, projects_controller
from backend.api.schemas.documents_schema import DocumentCreate, DocumentUpdate
from backend.api.schemas.prompts_schema import PromptCreate
from backend.api.schemas.selections_schema import SelectionCreate
from backend.api.schemas.files_schema import EncryptedFileDownloadRequest
from backend.core.security import security_manager
from backend.core.pdf_redactor import redactor
from backend.db.models import Project as ProjectModel, Document as DocumentModel, File as FileModel, Selection as SelectionModel
from backend.api.enums import FileType


class TestDocumentsController:
    def _create_project(self, db: Session, *, password: str = "StrongPW!123") -> ProjectModel:
        proj = ProjectModel(
            name=f"proj-{uuid.uuid4().hex[:6]}",
            description="desc",
            version=1,
            contact_name="tester",
            contact_email="tester@example.com",
            password_hash=security_manager.hash_password(password).encode("utf-8"),
        )
        db.add(proj)
        db.commit()
        db.refresh(proj)
        return proj

    def _create_document(self, db: Session, project_id) -> DocumentModel:
        dc = DocumentCreate(name=f"doc-{uuid.uuid4().hex[:6]}.pdf", description=None, project_id=project_id, tags=[])
        # Use controller create to initialize AI settings, etc.
        created = documents_controller.create(db=db, document_data=dc)
        # Load ORM for seeding files and selections
        model = db.query(DocumentModel).filter(DocumentModel.id == created.id).first()
        return model

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

    def test_create_get_list_shallow_and_search(self, test_session: Session):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)

        got = documents_controller.get(db=test_session, document_id=doc.id)
        assert got.id == doc.id and got.name == doc.name

        lst = documents_controller.get_list(db=test_session, skip=0, limit=100)
        assert any(str(i.id) == str(doc.id) for i in lst)

        shallow = documents_controller.get_shallow_list(db=test_session, skip=0, limit=100)
        assert any(str(i.id) == str(doc.id) for i in shallow)
        s = documents_controller.get_shallow(db=test_session, document_id=doc.id)
        assert s.id == doc.id
        with pytest.raises(HTTPException) as exc:
            documents_controller.get_shallow(db=test_session, document_id=uuid.UUID(int=0))
        assert exc.value.status_code == status.HTTP_404_NOT_FOUND

        # search by name wildcard and by project filter
        res = documents_controller.search_list(db=test_session, skip=0, limit=100, name="doc-*", project_id=proj.id)
        assert any(str(i.id) == str(doc.id) for i in res)

    def test_tags_prompts_selections(self, test_session: Session):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)

        # tags default empty
        tags = documents_controller.get_tags(db=test_session, document_id=doc.id)
        assert tags == []

        # prompts
        p = documents_controller.add_prompt(db=test_session, document_id=doc.id, prompt_data=PromptCreate(prompt="Analyze", directive="dir", title="t", enabled=True, document_id=doc.id))
        got_prompts = documents_controller.get_prompts(db=test_session, document_id=doc.id, skip=0, limit=100)
        assert any(pp.id == p.id for pp in got_prompts)

        # selections
        sc = SelectionCreate(page_number=1, x=0.1, y=0.2, width=0.3, height=0.4, confidence=None, committed=False, document_id=doc.id)
        sel = documents_controller.add_selection(db=test_session, document_id=doc.id, selection_data=sc)
        got_selections = documents_controller.get_selections(db=test_session, document_id=doc.id, skip=0, limit=100)
        assert any(ss.id == sel.id for ss in got_selections)

    def test_ai_settings_get_and_update(self, test_session: Session):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)

        ai1 = documents_controller.get_ai_settings(db=test_session, document_id=doc.id)
        assert ai1.model_name and ai1.temperature is not None

        from backend.api.schemas.documents_schema import DocumentAiSettingsUpdate
        ai2 = documents_controller.update_ai_settings(db=test_session, document_id=doc.id, data=DocumentAiSettingsUpdate(temperature=0.7))
        assert ai2.temperature == 0.7

    def test_update_and_delete(self, test_session: Session):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)

        old_name = doc.name
        updated = documents_controller.update(db=test_session, document_id=doc.id, document_data=DocumentUpdate(name=f"updated-{uuid.uuid4().hex[:4]}"))
        assert updated.id == doc.id and updated.name != old_name

        out = documents_controller.delete(db=test_session, document_id=doc.id)
        assert "deleted successfully" in out.message
        with pytest.raises(HTTPException) as exc:
            documents_controller.get(db=test_session, document_id=doc.id)
        assert exc.value.status_code == status.HTTP_404_NOT_FOUND

    def test_apply_ai_and_stage_no_enabled_prompts(self, test_session: Session):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)
        # no prompts enabled -> returns empty
        res = documents_controller.apply_ai_and_stage(db=test_session, document_id=doc.id)
        assert res == []

    def test_process_success_and_downloads(self, test_session: Session, client, monkeypatch):
        password = "StrongPW!123"
        proj = self._create_project(test_session, password=password)
        doc = self._create_document(test_session, proj.id)
        # attach original and one committed selection
        self._attach_original(test_session, doc, payload=b"%PDF-1.4 minimal", password=password)
        staged = SelectionModel(document_id=doc.id, x=0.1, y=0.1, width=0.2, height=0.2, page_number=1, committed=True)
        test_session.add(staged)
        test_session.commit()

        # if a redacted exists, it should be replaced (ensure only one after)
        self._attach_redacted(test_session, doc, payload=b"OLD")

        # mock ephemeral decrypt to return correct password and redactor to produce deterministic bytes
        monkeypatch.setattr(security_manager, "decrypt_with_ephemeral_key", lambda key_id, encrypted_data: password)
        monkeypatch.setattr(redactor, "redact_document", lambda pdf_data, selections: b"REDACTED-BYTES")

        req = EncryptedFileDownloadRequest(key_id="k", encrypted_password=base64.b64encode(b"ignored").decode("ascii"), stream=False)
        out = documents_controller.process(db=test_session, document_id=doc.id, request=req)
        assert out.detail and int(out.detail.get("redacted_file_size", 0)) == len(b"REDACTED-BYTES")

        # download redacted via API to easily read streaming
        res = client.get(f"/api/documents/id/{doc.id}/download/redacted")
        assert res.status_code == 200 and res.content == b"REDACTED-BYTES"
        # headers
        assert res.headers.get("Content-Disposition", "").startswith("attachment;")
        assert res.headers.get("Cache-Control") == "no-cache, no-store, must-revalidate"

    def test_process_no_committed_selections_400(self, test_session: Session, monkeypatch):
        password = "StrongPW!123"
        proj = self._create_project(test_session, password=password)
        doc = self._create_document(test_session, proj.id)
        self._attach_original(test_session, doc, payload=b"%PDF-1.4 minimal", password=password)
        # no committed selections
        monkeypatch.setattr(security_manager, "decrypt_with_ephemeral_key", lambda key_id, encrypted_data: password)
        req = EncryptedFileDownloadRequest(key_id="k", encrypted_password=base64.b64encode(b"ignored").decode("ascii"), stream=False)
        with pytest.raises(HTTPException) as exc:
            documents_controller.process(db=test_session, document_id=doc.id, request=req)
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST

    def test_download_original_file_via_controller(self, test_session: Session, client, monkeypatch):
        password = "StrongPW!123"
        proj = self._create_project(test_session, password=password)
        doc = self._create_document(test_session, proj.id)
        self._attach_original(test_session, doc, payload=b"ORIG", password=password)
        # via router for easy stream handling; mock ephemeral decrypt
        monkeypatch.setattr(security_manager, "decrypt_with_ephemeral_key", lambda key_id, encrypted_data: password)
        enc_b64 = base64.b64encode(b"ignored").decode("ascii")
        res = client.post(f"/api/documents/id/{doc.id}/download/original", json={
            "key_id": "k",
            "encrypted_password": enc_b64,
            "stream": False,
        })
        assert res.status_code == 200
        assert res.content == b"ORIG"
        assert "attachment" in res.headers.get("Content-Disposition", "")

