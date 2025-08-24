import base64
import uuid
import pytest
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.crud.support import SupportCrud
from backend.core.security import security_manager
from backend.db.models import Project as ProjectModel, Document as DocumentModel, File as FileModel, Selection as SelectionModel
from backend.api.enums import FileType


class TestSupportCrud:
    """SupportCrud unit tests for helpers and workflows."""

    @pytest.fixture
    def support(self) -> SupportCrud:
        return SupportCrud()

    def _create_project(self, db: Session, password: str = "TestPassword123!") -> ProjectModel:
        proj = ProjectModel(
            name=f"proj-{uuid.uuid4().hex[:8]}",
            description="test",
            contact_name="tester",
            contact_email="t@example.com",
            password_hash=security_manager.hash_password(password).encode("utf-8"),
        )
        db.add(proj)
        db.commit()
        db.refresh(proj)
        return proj

    def _create_document(self, db: Session, project_id) -> DocumentModel:
        doc = DocumentModel(
            name=f"doc-{uuid.uuid4().hex[:8]}.pdf",
            description="test doc",
            project_id=project_id,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc

    def _attach_original_file(self, db: Session, document: DocumentModel, plain_bytes: bytes, password: str) -> FileModel:
        encrypted, salt = security_manager.encrypt_data(plain_bytes, password)
        f = FileModel(
            file_hash=security_manager.generate_file_hash(plain_bytes),
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

    def _attach_redacted_file(self, db: Session, document: DocumentModel, data: bytes, *, with_salt: bool = False, bad_hash: bool = False) -> FileModel:
        f = FileModel(
            file_hash=("0" * 64 if bad_hash else security_manager.generate_file_hash(data)),
            file_type=FileType.REDACTED,
            mime_type="application/pdf",
            data=data,
            salt=(b"not_none" if with_salt else None),
            document_id=document.id,
        )
        db.add(f)
        db.commit()
        db.refresh(f)
        return f

    def test_apply_or_404_ok_and_not_found(self, test_session: Session, support: SupportCrud):
        proj = self._create_project(test_session)
        # OK path
        got = support.apply_or_404(support.projects_crud.read, db=test_session, id=proj.id)
        assert got.id == proj.id
        # Not found
        with pytest.raises(HTTPException) as exc:
            support.apply_or_404(support.projects_crud.read, db=test_session, id=uuid.uuid4())
        assert exc.value.status_code == status.HTTP_404_NOT_FOUND
        assert "Project" in exc.value.detail

    def test_get_original_file_data_success(self, test_session: Session, support: SupportCrud, monkeypatch):
        password = "StrongPW!123"
        proj = self._create_project(test_session, password=password)
        doc = self._create_document(test_session, proj.id)
        # Original file content
        payload = b"%PDF-1.4\n... minimal ..."
        self._attach_original_file(test_session, doc, payload, password)

        # Monkeypatch ephemeral decryptor to return the correct password regardless of inputs
        class FakeSec:
            def decrypt_with_ephemeral_key(self, key_id, encrypted_data):
                return password
        import backend.crud.support as support_mod
        monkeypatch.setattr(support_mod, "get_security_service", lambda: FakeSec())

        enc_b64 = base64.b64encode(b"ignored").decode("ascii")
        got_doc, got_file, got_data = support.get_original_file_data_or_400_401_404_500(
            db=test_session,
            document_or_id=doc,
            encrypted_password_b64=enc_b64,
            key_id="dummy",
            join_with=["files"],
        )
        assert got_doc.id == doc.id
        assert got_file.file_type == FileType.ORIGINAL
        assert got_data == payload

    def test_get_original_file_data_invalid_password_401(self, test_session: Session, support: SupportCrud, monkeypatch):
        proj = self._create_project(test_session, password="CorrectPW")
        doc = self._create_document(test_session, proj.id)
        self._attach_original_file(test_session, doc, b"contents", password="CorrectPW")

        # Return a wrong password
        class FakeSec:
            def decrypt_with_ephemeral_key(self, key_id, encrypted_data):
                return "WrongPW"
        import backend.crud.support as support_mod
        monkeypatch.setattr(support_mod, "get_security_service", lambda: FakeSec())

        enc_b64 = base64.b64encode(b"ignored").decode("ascii")
        with pytest.raises(HTTPException) as exc:
            support.get_original_file_data_or_400_401_404_500(
                db=test_session,
                document_or_id=doc.id,
                encrypted_password_b64=enc_b64,
                key_id="dummy",
            )
        assert exc.value.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_redacted_file_data_success(self, test_session: Session, support: SupportCrud):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)
        content = b"redacted-pdf"
        self._attach_redacted_file(test_session, doc, content)

        got_doc, got_file, got_data = support.get_redacted_file_data_or_404_500(
            db=test_session,
            document_id=doc.id,
            join_with=["files"],
        )
        assert got_doc.id == doc.id
        assert got_file.file_type == FileType.REDACTED
        assert got_data == content

    def test_get_redacted_file_encrypted_500(self, test_session: Session, support: SupportCrud):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)
        content = b"redacted-pdf"
        self._attach_redacted_file(test_session, doc, content, with_salt=True)

        with pytest.raises(HTTPException) as exc:
            support.get_redacted_file_data_or_404_500(db=test_session, document_id=doc.id)
        assert exc.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "encrypted" in exc.value.detail

    def test_get_redacted_file_hash_mismatch_500(self, test_session: Session, support: SupportCrud):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)
        content = b"redacted-pdf"
        self._attach_redacted_file(test_session, doc, content, bad_hash=True)

        with pytest.raises(HTTPException) as exc:
            support.get_redacted_file_data_or_404_500(db=test_session, document_id=doc.id)
        assert exc.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "integrity" in exc.value.detail

    def test_selection_lifecycle_helpers(self, test_session: Session, support: SupportCrud):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)
        # Create staged selections
        from backend.api.enums import CommitState, ScopeType
        s1 = SelectionModel(document_id=doc.id, x=0.1, y=0.1, width=0.2, height=0.2, page_number=1, scope=ScopeType.DOCUMENT, state=CommitState.STAGED_CREATION)
        s2 = SelectionModel(document_id=doc.id, x=0.2, y=0.2, width=0.3, height=0.3, page_number=1, scope=ScopeType.DOCUMENT, state=CommitState.STAGED_CREATION)
        test_session.add_all([s1, s2])
        test_session.commit()

        committed = support.commit_staged_selections(test_session, document_id=doc.id, selection_ids=None, commit_all=True)
        assert len(committed) >= 2
        # They should now be committed in DB
        from backend.api.enums import CommitState
        refreshed = support.selections_crud.read_list_by_document(test_session, document_id=doc.id)
        assert all(getattr(s, "state", None) == CommitState.COMMITTED for s in refreshed)

        # Uncommit all
        staged = support.uncommit_selections(test_session, document_id=doc.id, selection_ids=None, uncommit_all=True)
        assert len(staged) >= 2
        from backend.api.enums import CommitState
        refreshed2 = support.selections_crud.read_list_by_document(test_session, document_id=doc.id)
        assert all(getattr(s, "state", None) == CommitState.STAGED_EDITION for s in refreshed2)

        # Clear staged (all)
        deleted_count = support.clear_staged_selections(test_session, document_id=doc.id, selection_ids=None, clear_all=True)
        assert deleted_count >= 2
        refreshed3 = support.selections_crud.read_list_by_document(test_session, document_id=doc.id)
        assert len(refreshed3) == 0

    def test_decrypt_password_invalid_base64_400(self, test_session: Session, support: SupportCrud):
        with pytest.raises(HTTPException) as exc:
            support._decrypt_password_or_400(encrypted_password_b64="???", key_id="x")
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST

    def test_decrypt_password_ephemeral_none_400(self, test_session: Session, support: SupportCrud, monkeypatch):
        monkeypatch.setattr(security_manager, "decrypt_with_ephemeral_key", lambda key_id, encrypted_data: None)
        bad_b64 = base64.b64encode(b"ignored").decode("ascii")
        with pytest.raises(HTTPException) as exc:
            support._decrypt_password_or_400(encrypted_password_b64=bad_b64, key_id="x")
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST

    def test_decrypt_original_file_or_500_error_paths(self, test_session: Session, support: SupportCrud, monkeypatch):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)
        # salt None -> 500
        f1 = FileModel(
            file_hash="0"*64,
            file_type=FileType.ORIGINAL,
            mime_type="application/pdf",
            data=b"encrypted",
            salt=None,
            document_id=doc.id,
        )
        test_session.add(f1)
        test_session.commit()

        with pytest.raises(HTTPException) as exc1:
            support._decrypt_original_file_or_500(original_file=f1, password="x")
        assert exc1.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

        # decrypt returns None -> 500
        f2 = FileModel(
            file_hash="0"*64,
            file_type=FileType.ORIGINAL,
            mime_type="application/pdf",
            data=b"encrypted",
            salt=b"salt",
            document_id=doc.id,
        )
        test_session.add(f2)
        test_session.commit()
        monkeypatch.setattr(security_manager, "decrypt_data", lambda encrypted_data, password, salt: None)
        with pytest.raises(HTTPException) as exc2:
            support._decrypt_original_file_or_500(original_file=f2, password="x")
        assert exc2.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

        # hash mismatch -> 500
        def fake_decrypt(encrypted_data, password, salt):
            return b"plain"
        monkeypatch.setattr(security_manager, "decrypt_data", fake_decrypt)
        f2.file_hash = "1"*64  # not matching hash of b"plain"
        with pytest.raises(HTTPException) as exc3:
            support._decrypt_original_file_or_500(original_file=f2, password="x")
        assert exc3.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_get_original_and_redacted_file_or_404_missing(self, test_session: Session, support: SupportCrud):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)
        with pytest.raises(HTTPException) as e1:
            support._get_original_file_or_404(doc)
        assert e1.value.status_code == status.HTTP_404_NOT_FOUND
        with pytest.raises(HTTPException) as e2:
            support._get_redacted_file_or_404(doc)
        assert e2.value.status_code == status.HTTP_404_NOT_FOUND

    def test_verify_project_password_or_401_direct(self, test_session: Session, support: SupportCrud):
        proj = self._create_project(test_session, password="CorrectPW1!")
        # valid
        support.verify_project_password_or_401(test_session, project_id=proj.id, password="CorrectPW1!")
        # invalid
        with pytest.raises(HTTPException) as exc:
            support.verify_project_password_or_401(test_session, project_id=proj.id, password="wrong")
        assert exc.value.status_code == status.HTTP_401_UNAUTHORIZED

    def test_ensure_project_ai_settings(self, test_session: Session, support: SupportCrud):
        proj = self._create_project(test_session)
        # first call creates
        created = support.ensure_project_ai_settings(test_session, project_id=proj.id)
        assert created.project_id == proj.id
        # second returns existing
        existing = support.ensure_project_ai_settings(test_session, project_id=proj.id)
        assert existing.id == created.id

    def test_build_shallow_list_tuple_and_row(self, test_session: Session, support: SupportCrud):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)
        # tuple record: (model, counts...)
        records = [(doc, 0, 0, False)]
        from backend.api.schemas.documents_schema import DocumentShallow
        items = support.build_shallow_list(records, schema_cls=DocumentShallow, transforms={
            "prompt_count": lambda ctx: int(ctx["record"][1] or 0),
            "selection_count": lambda ctx: int(ctx["record"][2] or 0),
            "is_processed": lambda ctx: bool(ctx["record"][3]),
        })
        assert items and items[0].id == doc.id

        class FauxRow:
            def __init__(self, model, c1, c2, c3):
                self._data = (model, c1, c2, c3)
            def __getitem__(self, idx):
                return self._data[idx]
        faux = [FauxRow(doc, 1, 2, True)]
        items2 = support.build_shallow_list(faux, schema_cls=DocumentShallow, transforms={
            "prompt_count": lambda ctx: int(ctx["record"][1] or 0),
            "selection_count": lambda ctx: int(ctx["record"][2] or 0),
            "is_processed": lambda ctx: bool(ctx["record"][3]),
        })
        assert items2 and items2[0].prompt_count == 1

    def test_bulk_create_documents_with_files_and_init(self, test_session: Session, support: SupportCrud):
        proj = self._create_project(test_session)
        from backend.api.schemas.documents_schema import DocumentBulkUpload, DocumentCreate
        from backend.api.schemas.files_schema import FileCreate
        bulk = [
            DocumentBulkUpload(
                document_data=DocumentCreate(name=f"b-{uuid.uuid4().hex[:4]}.pdf", description=None, project_id=proj.id),
                file_data=FileCreate(
                    file_hash="0"*64,
                    file_type=FileType.ORIGINAL,
                    mime_type="application/pdf",
                    data=b"encrypted",
                    salt=b"salt",
                    document_id=None,
                )
            )
        ]
        created_docs = support.bulk_create_documents_with_files_and_init(test_session, bulk)
        assert len(created_docs) == 1
        # ai_settings created (project-scoped)
        from backend.db.models import AiSettings
        settings = test_session.query(AiSettings).filter(AiSettings.project_id == created_docs[0].project_id).first()
        assert settings is not None
