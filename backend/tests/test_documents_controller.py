import base64
import uuid
import pytest
from sqlalchemy.orm import Session

from fastapi import HTTPException, status

from src.api.controllers import documents_controller
from src.api.schemas.documents_schema import DocumentCreate, DocumentUpdate, AiApplyResponse
from src.api.schemas.prompts_schema import PromptCreate
from src.api.schemas.files_schema import EncryptedFileDownloadRequest
from src.core.security import security_manager
from src.core.pdf_redactor import redactor
from src.db.models import Project as ProjectModel, Document as DocumentModel, File as FileModel, Selection as SelectionModel
from src.api.enums import FileType, CommitState


class TestDocumentsController:
    def _create_project(self, db: Session, *, password: str = "StrongPW!123") -> ProjectModel:
        proj = ProjectModel(
            name=f"proj-{uuid.uuid4().hex[:6]}",
            description="desc",
            contact_name="tester",
            contact_email="tester@example.com",
            password_hash=security_manager.hash_password(password).encode("utf-8"),
        )
        db.add(proj)
        db.commit()
        db.refresh(proj)
        return proj

    def _create_document(self, db: Session, project_id) -> DocumentModel:
        dc = DocumentCreate(name=f"doc-{uuid.uuid4().hex[:6]}.pdf", description=None, project_id=project_id)
        # Use controller create
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

    
    def test_ai_settings_get_and_update(self, test_session: Session):
        proj = self._create_project(test_session)

        from src.api.controllers import projects_controller
        from src.api.schemas.settings_schema import AiSettingsUpdate
        ai1 = projects_controller.get_ai_settings(db=test_session, project_id=proj.id)
        assert ai1.model_name and ai1.temperature is not None

        # Call again to hit the 'return existing settings' branch
        ai_existing = projects_controller.get_ai_settings(db=test_session, project_id=proj.id)
        assert ai_existing.id == ai1.id

        ai2 = projects_controller.update_ai_settings(db=test_session, project_id=proj.id, data=AiSettingsUpdate(temperature=0.7))
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
        # no prompts enabled -> returns empty selections within AiApplyResponse
        from src.api.controllers import ai_controller
        from src.api.schemas.ai_schema import AiApplyRequest
        import asyncio
        res = asyncio.run(ai_controller.apply(db=test_session, request=AiApplyRequest(document_id=doc.id)))
        assert isinstance(res, AiApplyResponse)
        assert res.selections == []

    def test_process_success_and_downloads(self, test_session: Session, client, monkeypatch):
        password = "StrongPW!123"
        proj = self._create_project(test_session, password=password)
        doc = self._create_document(test_session, proj.id)
        # attach original and one committed selection
        self._attach_original(test_session, doc, payload=b"%PDF-1.4 minimal", password=password)
        from src.api.enums import CommitState, ScopeType
        staged = SelectionModel(document_id=doc.id, x=0.1, y=0.1, width=0.2, height=0.2, page_number=1, scope=ScopeType.DOCUMENT, state=CommitState.COMMITTED)
        test_session.add(staged)
        test_session.commit()

        # if a redacted exists, it should be replaced (ensure only one after)
        self._attach_redacted(test_session, doc, payload=b"OLD")

        # mock ephemeral decrypt to return correct password and redactor to produce deterministic bytes
        class FakeSec:
            def decrypt_with_ephemeral_key(self, key_id, encrypted_data):
                return password
        import src.crud.support as support_mod
        monkeypatch.setattr(support_mod, "get_security_service", lambda: FakeSec())
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

    def test_get_template_selections_success_and_filtering(self, test_session: Session):
        # Setup: project with two documents; mark the first as template
        proj = self._create_project(test_session)
        template_doc = self._create_document(test_session, proj.id)
        other_doc = self._create_document(test_session, proj.id)
        # Set template mapping via controller
        _ = documents_controller.set_as_project_template(db=test_session, document_id=template_doc.id)
        # Seed selections on the template document with various states/scopes
        from src.api.enums import ScopeType
        s1 = SelectionModel(
            document_id=template_doc.id,
            x=0.1,
            y=0.1,
            width=0.2,
            height=0.2,
            page_number=None,
            scope=ScopeType.PROJECT,
            state=CommitState.COMMITTED,
        )
        s2 = SelectionModel(
            document_id=template_doc.id,
            x=0.3,
            y=0.3,
            width=0.1,
            height=0.1,
            page_number=0,
            scope=ScopeType.PROJECT,
            state=CommitState.COMMITTED,
        )
        # Non-qualifying selections (should be filtered out)
        s3 = SelectionModel(  # document-scoped
            document_id=template_doc.id,
            x=0.4,
            y=0.4,
            width=0.1,
            height=0.1,
            page_number=1,
            scope=ScopeType.DOCUMENT,
            state=CommitState.COMMITTED,
        )
        s4 = SelectionModel(  # staged
            document_id=template_doc.id,
            x=0.5,
            y=0.5,
            width=0.1,
            height=0.1,
            page_number=2,
            scope=ScopeType.PROJECT,
            state=CommitState.STAGED_CREATION,
        )
        test_session.add_all([s1, s2, s3, s4])
        test_session.commit()
        # Exercise
        res = documents_controller.get_template_selections(db=test_session, document_id=other_doc.id, skip=0, limit=100)
        # Assert: only s1 and s2 returned
        got_ids = {str(i.id) for i in res}
        assert {str(s1.id), str(s2.id)}.issubset(got_ids)
        assert str(s3.id) not in got_ids and str(s4.id) not in got_ids

    def test_get_template_selections_404_when_no_template(self, test_session: Session):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)
        # No template set for the project
        with pytest.raises(HTTPException) as exc:
            _ = documents_controller.get_template_selections(db=test_session, document_id=doc.id)
        assert exc.value.status_code == status.HTTP_404_NOT_FOUND

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

    def test_create_with_file_error_mappings_and_success(self, test_session: Session, monkeypatch):
        # Setup project and fake upload input
        proj = self._create_project(test_session)
        class DummyUpload:
            def __init__(self, project_id):
                self.project_id = project_id
                class F:
                    def __init__(self):
                        self.file = None
                        self.filename = "f.pdf"
                        self.content_type = "application/pdf"
                self.file = F()
        from src.api.schemas.documents_schema import DocumentCreate
        from src.api.schemas.files_schema import FileCreate
        from src.api.schemas.documents_schema import DocumentBulkUpload

        # No-op password verification
        monkeypatch.setattr(documents_controller.support_crud, "verify_project_password_or_401", lambda db, project_id, password: None)
        # Provide settings.processing for error message formatting
        monkeypatch.setattr(security_manager, "settings", type("T", (), {"processing": type("P", (), {"max_file_size": 10 * 1024 * 1024})()})(), raising=False)

        # Error: too large -> 413
        monkeypatch.setattr(documents_controller.support_crud, "process_upload", lambda db, project_id, upload_data, password: ("f.pdf", "File too large"))
        with pytest.raises(HTTPException) as e413:
            documents_controller.create_with_file(db=test_session, upload_data=DummyUpload(proj.id), password="pw")
        assert e413.value.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE

        # Error: invalid pdf -> 400
        monkeypatch.setattr(documents_controller.support_crud, "process_upload", lambda db, project_id, upload_data, password: ("f.pdf", "Invalid PDF"))
        with pytest.raises(HTTPException) as e400:
            documents_controller.create_with_file(db=test_session, upload_data=DummyUpload(proj.id), password="pw")
        assert e400.value.status_code == status.HTTP_400_BAD_REQUEST

        # Error: filename exists -> 409
        monkeypatch.setattr(documents_controller.support_crud, "process_upload", lambda db, project_id, upload_data, password: ("f.pdf", "Filename already exists"))
        with pytest.raises(HTTPException) as e409:
            documents_controller.create_with_file(db=test_session, upload_data=DummyUpload(proj.id), password="pw")
        assert e409.value.status_code == status.HTTP_409_CONFLICT

        # Error: generic -> 500
        monkeypatch.setattr(documents_controller.support_crud, "process_upload", lambda db, project_id, upload_data, password: ("f.pdf", "Boom"))
        with pytest.raises(HTTPException) as e500:
            documents_controller.create_with_file(db=test_session, upload_data=DummyUpload(proj.id), password="pw")
        assert e500.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

        # Success path: returns bulk descriptor -> use existing ORM doc as created result
        # create an ORM doc to mirror created outcome
        model_doc = DocumentModel(name="s.pdf", description=None, project_id=proj.id)
        test_session.add(model_doc)
        test_session.commit()
        test_session.refresh(model_doc)
        # process_upload returns a DocumentBulkUpload instance
        def fake_process(db, project_id, upload_data, password):
            return DocumentBulkUpload(
                document_data=DocumentCreate(name="s.pdf", description=None, project_id=proj.id, tags=[]),
                file_data=FileCreate(file_hash="0"*64, file_type=FileType.ORIGINAL, mime_type="application/pdf", data=b"e", salt=b"s", document_id=None),
            )
        monkeypatch.setattr(documents_controller.support_crud, "process_upload", fake_process)
        # bulk_create_documents_with_files_and_init returns our model
        monkeypatch.setattr(documents_controller.support_crud, "bulk_create_documents_with_files_and_init", lambda db, bulk_data: [model_doc])
        out = documents_controller.create_with_file(db=test_session, upload_data=DummyUpload(proj.id), password="pw")
        assert out.id == model_doc.id

    def test_bulk_upload_variants(self, test_session: Session, monkeypatch):
        # empty
        empty = documents_controller.bulk_create_with_files(db=test_session, uploads_data=[], password="pw")
        assert empty.detail["total_files"] == 0

        # mismatched project ids -> 400
        class DummyU:
            def __init__(self, project_id):
                self.project_id = project_id
        p1 = self._create_project(test_session)
        p2 = self._create_project(test_session)
        # bypass password verify to reach mismatch branch
        monkeypatch.setattr(documents_controller.support_crud, "verify_project_password_or_401", lambda db, project_id, password: None)
        with pytest.raises(HTTPException) as e400:
            documents_controller.bulk_create_with_files(db=test_session, uploads_data=[DummyU(p1.id), DummyU(p2.id)], password="pw")
        assert e400.value.status_code == status.HTTP_400_BAD_REQUEST

        # Success with mixed results and template, and bulk error path
        proj = self._create_project(test_session)
        monkeypatch.setattr(documents_controller.support_crud, "verify_project_password_or_401", lambda db, project_id, password: None)
        # Two successes and one error
        from src.api.schemas.documents_schema import DocumentBulkUpload, DocumentCreate
        from src.api.schemas.files_schema import FileCreate
        def fake_proc(db, project_id, upload_data, password):
            if getattr(upload_data, "_err", False):
                return ("bad.pdf", "Invalid PDF")
            return DocumentBulkUpload(
                document_data=DocumentCreate(name=f"{uuid.uuid4().hex[:4]}.pdf", description=None, project_id=proj.id),
                file_data=FileCreate(file_hash="0"*64, file_type=FileType.ORIGINAL, mime_type="application/pdf", data=b"e", salt=b"s", document_id=None),
            )
        monkeypatch.setattr(documents_controller.support_crud, "process_upload", fake_proc)
        # stub bulk_create_with_files to return minimal records with expected attrs
        class R:
            def __init__(self, name):
                class F:
                    def __init__(self):
                        self.id = uuid.uuid4()
                self.name = name
                self.files = [F()]
                self.id = uuid.uuid4()
        def fake_bulk(db, bulk_data):
            return [R(b.document_data.name) for b in bulk_data]
        monkeypatch.setattr(documents_controller.documents_crud, "bulk_create_with_files", fake_bulk)

        class DU:
            def __init__(self, project_id, err=False):
                self.project_id = project_id
                self._err = err
        res_ok = documents_controller.bulk_create_with_files(db=test_session, uploads_data=[DU(proj.id), DU(proj.id), DU(proj.id, err=True)], password="pw", template_description="templ")
        assert res_ok.detail["success_count"] == 2 and res_ok.detail["error_count"] == 1
        # bulk error path
        monkeypatch.setattr(documents_controller.documents_crud, "bulk_create_with_files", lambda db, bulk_data: (_ for _ in ()).throw(Exception("boom")))
        with pytest.raises(HTTPException) as e500:
            documents_controller.bulk_create_with_files(db=test_session, uploads_data=[DU(proj.id)], password="pw")
        assert e500.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_apply_ai_and_stage_with_enabled_prompts(self, test_session: Session, monkeypatch):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)
        # add a committed prompt (state-based)
        from src.api.schemas.prompts_schema import PromptCreate
        from src.api.enums import CommitState
        documents_controller.add_prompt(db=test_session, document_id=doc.id, prompt_data=PromptCreate(title="t", prompt="p", directive="d", state=CommitState.COMMITTED, document_id=doc.id))
        # mock AI service
        class FakeSvc:
            async def generate_selections(self, req):
                from src.api.schemas.selections_schema import SelectionCreate
                return type("Resp", (), {
                    "selections": [SelectionCreate(page_number=1, x=0.1, y=0.1, width=0.2, height=0.2, confidence=0.9, document_id=doc.id)]
                })()
# Patch the exact function bound in ai_controller's namespace
        from src.api.controllers import ai_controller
        monkeypatch.setattr(ai_controller, "get_ai_service", lambda: FakeSvc())
        from src.api.controllers import ai_controller
        from src.api.schemas.ai_schema import AiApplyRequest
        import asyncio
        out = asyncio.run(ai_controller.apply(db=test_session, request=AiApplyRequest(document_id=doc.id)))
        assert isinstance(out, AiApplyResponse)
        assert len(out.selections) == 1 and getattr(out.selections[0], "is_staged", False) is True

    def test_summarize_document_fields(self, test_session: Session):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)
        # attach files, prompts, selections
        self._attach_original(test_session, doc, payload=b"ORIG")
        self._attach_redacted(test_session, doc, payload=b"REDACT")
        documents_controller.add_prompt(db=test_session, document_id=doc.id, prompt_data=PromptCreate(title="t", prompt="p", directive="d", enabled=True, document_id=doc.id))
        from src.api.enums import ScopeType
        sc1 = SelectionModel(document_id=doc.id, x=0.1, y=0.1, width=0.2, height=0.2, page_number=1, scope=ScopeType.DOCUMENT, state=CommitState.STAGED_CREATION, confidence=0.8)
        sc2 = SelectionModel(document_id=doc.id, x=0.2, y=0.2, width=0.2, height=0.2, page_number=1, scope=ScopeType.DOCUMENT, state=CommitState.STAGED_CREATION, confidence=None)
        test_session.add_all([sc1, sc2])
        test_session.commit()
        summ = documents_controller.summarize(db=test_session, document_id=doc.id)
        assert summ.has_original_file and summ.has_redacted_file
        assert summ.prompt_count >= 1 and summ.selection_count >= 2

    def test_process_error_paths(self, test_session: Session, monkeypatch):
        password = "StrongPW!123"
        proj = self._create_project(test_session, password=password)
        doc = self._create_document(test_session, proj.id)
        self._attach_original(test_session, doc, payload=b"%PDF-1.4 minimal", password=password)
        s = SelectionModel(document_id=doc.id, x=0.1, y=0.1, width=0.2, height=0.2, page_number=1, state=CommitState.COMMITTED)
        test_session.add(s)
        test_session.commit()
        monkeypatch.setattr(security_manager, "decrypt_with_ephemeral_key", lambda key_id, encrypted_data: password)
        req = EncryptedFileDownloadRequest(key_id="k", encrypted_password=base64.b64encode(b"ignored").decode("ascii"), stream=False)

        # redactor failure -> 500
        monkeypatch.setattr(redactor, "redact_document", lambda pdf_data, selections: (_ for _ in ()).throw(Exception("fail")))
        with pytest.raises(HTTPException) as e500a:
            documents_controller.process(db=test_session, document_id=doc.id, request=req)
        assert e500a.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

        # save redacted failure -> 500
        monkeypatch.setattr(redactor, "redact_document", lambda pdf_data, selections: b"OK")
        monkeypatch.setattr(documents_controller.files_crud, "create", lambda db, data: (_ for _ in ()).throw(Exception("save-fail")))
        with pytest.raises(HTTPException) as e500b:
            documents_controller.process(db=test_session, document_id=doc.id, request=req)
        assert e500b.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_download_original_stream_inline_headers(self, test_session: Session, client, monkeypatch):
        password = "StrongPW!123"
        proj = self._create_project(test_session, password=password)
        doc = self._create_document(test_session, proj.id)
        self._attach_original(test_session, doc, payload=b"ORIG", password=password)
        monkeypatch.setattr(security_manager, "decrypt_with_ephemeral_key", lambda key_id, encrypted_data: password)
        enc_b64 = base64.b64encode(b"ignored").decode("ascii")
        res = client.post(f"/api/documents/id/{doc.id}/download/original", json={
            "key_id": "k",
            "encrypted_password": enc_b64,
            "stream": True,
        })
        assert res.status_code == 200 and res.content == b"ORIG"
        # inline header
        assert res.headers.get("Content-Disposition", "") == "inline"
        assert res.headers.get("Cache-Control") == "no-cache, no-store, must-revalidate"
        assert res.headers.get("Pragma") == "no-cache"
        assert res.headers.get("Expires") == "0"

    def test_create_with_file_generic_exception_500(self, test_session: Session, monkeypatch):
        # Cause generic exception inside create_with_file try block
        proj = self._create_project(test_session)
        class DummyUpload:
            def __init__(self, project_id):
                self.project_id = project_id
                class F:
                    def __init__(self):
                        self.file = None
                        self.filename = "f.pdf"
                        self.content_type = "application/pdf"
                self.file = F()
        from src.api.schemas.documents_schema import DocumentCreate
        from src.api.schemas.files_schema import FileCreate
        from src.api.schemas.documents_schema import DocumentBulkUpload
        # No-op password verify and settings fixture
        monkeypatch.setattr(documents_controller.support_crud, "verify_project_password_or_401", lambda db, project_id, password: None)
        monkeypatch.setattr(security_manager, "settings", type("T", (), {"processing": type("P", (), {"max_file_size": 10 * 1024 * 1024})()})(), raising=False)
        # Return a valid bulk upload descriptor
        def fake_process(db, project_id, upload_data, password):
            return DocumentBulkUpload(
                document_data=DocumentCreate(name="s.pdf", description=None, project_id=proj.id),
                file_data=FileCreate(file_hash="0"*64, file_type=FileType.ORIGINAL, mime_type="application/pdf", data=b"e", salt=b"s", document_id=None),
            )
        monkeypatch.setattr(documents_controller.support_crud, "process_upload", fake_process)
        # Force exception in bulk_create_documents_with_files_and_init
        monkeypatch.setattr(documents_controller.support_crud, "bulk_create_documents_with_files_and_init", lambda db, bulk_data: (_ for _ in ()).throw(Exception("boom")))
        with pytest.raises(HTTPException) as e500:
            documents_controller.create_with_file(db=test_session, upload_data=DummyUpload(proj.id), password="pw")
        assert e500.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_get_and_update_ai_settings_when_missing(self, test_session: Session):
        # Create doc via ORM to ensure no ai_settings exist
        proj = self._create_project(test_session)
        doc = DocumentModel(name=f"doc-{uuid.uuid4().hex[:6]}.pdf", description=None, project_id=proj.id)
        test_session.add(doc)
        test_session.commit()
        test_session.refresh(doc)
        # get_ai_settings should create defaults at project-level
        from src.api.controllers import projects_controller
        ai = projects_controller.get_ai_settings(db=test_session, project_id=proj.id)
        assert ai.project_id == proj.id and ai.temperature is not None
        # Now update_ai_settings on a different fresh doc without settings to hit the None branch
        doc2 = DocumentModel(name=f"doc-{uuid.uuid4().hex[:6]}.pdf", description=None, project_id=proj.id)
        test_session.add(doc2)
        test_session.commit()
        test_session.refresh(doc2)
        from src.api.schemas.settings_schema import AiSettingsUpdate
        updated = projects_controller.update_ai_settings(db=test_session, project_id=proj.id, data=AiSettingsUpdate(temperature=0.5))
        assert updated.project_id == proj.id and updated.temperature is not None
