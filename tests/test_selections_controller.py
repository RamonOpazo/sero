import uuid
import pytest
from sqlalchemy.orm import Session

from fastapi import HTTPException, status

from backend.api.controllers import selections_controller, documents_controller
from backend.api.schemas.selections_schema import SelectionCreate, SelectionUpdate, SelectionCommitRequest, SelectionUncommitRequest, SelectionClearRequest
from backend.api.schemas.documents_schema import DocumentCreate
from backend.core.security import security_manager
from backend.db.models import Project as ProjectModel, Document as DocumentModel, File as FileModel
from backend.api.enums import FileType, CommitState


class TestSelectionsController:
    def _create_project(self, db: Session) -> ProjectModel:
        # Projects controller already well-tested; create minimal ORM project directly
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
        dc = DocumentCreate(name=f"doc-{uuid.uuid4().hex[:6]}.pdf", description=None, project_id=project_id)
        # create directly via ORM for tight control
        doc = DocumentModel(
            name=dc.name,
            description=dc.description,
            project_id=project_id,
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

    def test_create_get_list_update_delete_selection(self, test_session: Session):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)

        # Create
        sc = SelectionCreate(page_number=1, x=0.1, y=0.2, width=0.3, height=0.4, confidence=0.8, document_id=doc.id)
        created = selections_controller.create(db=test_session, selection_data=sc)
        assert created.id and created.document_id == doc.id
        assert created.is_ai_generated is True

        # Get
        got = selections_controller.get(db=test_session, selection_id=created.id)
        assert got.id == created.id
        assert got.page_number == 1

        # List
        lst = selections_controller.get_list(db=test_session, skip=0, limit=100)
        ids = {str(i.id) for i in lst}
        assert str(created.id) in ids

        # Update (commit)
        su = SelectionUpdate(page_number=2, x=0.2, y=0.3, width=0.4, height=0.5, confidence=0.9, state=CommitState.COMMITTED)
        updated = selections_controller.update(db=test_session, selection_id=created.id, selection_data=su)
        assert updated.page_number == 2
        assert updated.state == CommitState.COMMITTED

        # Convert committed -> staged_edition via dedicated endpoint, then mark deletion
        converted = selections_controller.convert_committed_to_staged(db=test_session, selection_id=created.id)
        assert converted.state == CommitState.STAGED_EDITION

        # Delete requires staged_deletion now
        _ = selections_controller.update(db=test_session, selection_id=created.id, selection_data=SelectionUpdate(state=CommitState.STAGED_DELETION))
        out = selections_controller.delete(db=test_session, selection_id=created.id)
        assert "deleted successfully" in out.message
        with pytest.raises(HTTPException) as exc:
            selections_controller.get(db=test_session, selection_id=created.id)
        assert exc.value.status_code == status.HTTP_404_NOT_FOUND

    def test_get_not_found_404(self, test_session: Session):
        with pytest.raises(HTTPException) as exc:
            selections_controller.get(db=test_session, selection_id=uuid.UUID(int=0))
        assert exc.value.status_code == status.HTTP_404_NOT_FOUND

    def test_update_not_found_404(self, test_session: Session):
        su = SelectionUpdate(x=0.5)
        with pytest.raises(HTTPException) as exc:
            selections_controller.update(db=test_session, selection_id=uuid.UUID(int=0), selection_data=su)
        assert exc.value.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_not_found_404(self, test_session: Session):
        with pytest.raises(HTTPException) as exc:
            selections_controller.delete(db=test_session, selection_id=uuid.UUID(int=0))
        assert exc.value.status_code == status.HTTP_404_NOT_FOUND

    def test_commit_uncommit_clear_lifecycle(self, test_session: Session):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)

        # Seed 3 staged selections
        sids = []
        for i in range(3):
            sc = SelectionCreate(page_number=1, x=0.1+i*0.1, y=0.1, width=0.2, height=0.3, confidence=None, document_id=doc.id)
            created = selections_controller.create(db=test_session, selection_data=sc)
            sids.append(created.id)

        # Commit some via documents_controller.commit_staged_selections (controller lifecycle path)
        req_some = SelectionCommitRequest(selection_ids=[sids[0], sids[1]], commit_all=False)
        committed_some = documents_controller.commit_staged_selections(db=test_session, document_id=doc.id, request=req_some)
        assert len(committed_some) >= 2
        assert all(i.state == CommitState.COMMITTED for i in committed_some if str(i.id) in {str(sids[0]), str(sids[1])})

        # Commit all remaining staged selections
        req_all = SelectionCommitRequest(selection_ids=None, commit_all=True)
        committed_all = documents_controller.commit_staged_selections(db=test_session, document_id=doc.id, request=req_all)
        assert len(committed_all) >= 3

        # After commit all, all should be committed
        all_after = documents_controller.get_selections(db=test_session, document_id=doc.id)
        assert len(all_after) == 3
        assert all(i.state == CommitState.COMMITTED for i in all_after)

        # Uncommit some
        unreq_some = SelectionUncommitRequest(selection_ids=[sids[0]], uncommit_all=False)
        staged_some = documents_controller.uncommit_selections(db=test_session, document_id=doc.id, request=unreq_some)
        assert any(str(i.id) == str(sids[0]) for i in staged_some)
        # Uncommit all
        unreq_all = SelectionUncommitRequest(selection_ids=None, uncommit_all=True)
        staged_all = documents_controller.uncommit_selections(db=test_session, document_id=doc.id, request=unreq_all)
        assert len(staged_all) == 3
        assert all(i.state == CommitState.STAGED_EDITION for i in staged_all)

        # Clear staged (delete uncommitted)
        clr_req = SelectionClearRequest(selection_ids=None, clear_all=True)
        res = documents_controller.clear_staged_selections(db=test_session, document_id=doc.id, request=clr_req)
        assert res.detail and int(res.detail.get("deleted_count", 0)) >= 3
        remaining = documents_controller.get_selections(db=test_session, document_id=doc.id)
        assert remaining == []

