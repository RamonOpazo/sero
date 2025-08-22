import uuid
import pytest
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from fastapi import HTTPException, status

from backend.api.controllers import projects_controller
from backend.api.schemas.projects_schema import ProjectCreate, ProjectUpdate
from backend.api.schemas.documents_schema import DocumentCreate
from backend.api.enums import FileType, ProjectStatus
from backend.core.security import security_manager
from backend.db.models import Project as ProjectModel, Document as DocumentModel, File as FileModel


class TestProjectsController:
    def _create_project(self, db: Session, *, name: str = None) -> ProjectModel:
        name = name or f"proj-{uuid.uuid4().hex[:6]}"
        pc = ProjectCreate(
            name=name,
            description="desc",
            version=1,
            contact_name="tester",
            contact_email="tester@example.com",
            password="StrongPW!123",
        )
        created = projects_controller.create(db=db, project_data=pc)
        # return ORM model for further seeding
        return db.query(ProjectModel).filter(ProjectModel.id == created.id).first()

    def _create_document(self, db: Session, project_id) -> DocumentModel:
        dc = DocumentCreate(name=f"doc-{uuid.uuid4().hex[:6]}.pdf", description=None, project_id=project_id, tags=[])
        # create directly via ORM for tight control
        doc = DocumentModel(
            name=dc.name,
            description=dc.description,
            project_id=project_id,
            tags=[],
            created_at=datetime.now(timezone.utc),
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

    def test_create_and_get_project_success(self, test_session: Session):
        proj = self._create_project(test_session)
        out = projects_controller.get(db=test_session, project_id=proj.id)
        assert out.id == proj.id
        assert out.name == proj.name
        assert out.documents == []

    def test_create_duplicate_name_raises_400(self, test_session: Session):
        name = f"dup-{uuid.uuid4().hex[:6]}"
        _ = self._create_project(test_session, name=name)
        with pytest.raises(HTTPException) as exc:
            projects_controller.create(
                db=test_session,
                project_data=ProjectCreate(
                    name=name,
                    description="desc",
                    version=1,
                    contact_name="tester",
                    contact_email="tester@example.com",
                    password="StrongPW!123",
                ),
            )
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "already exists" in exc.value.detail

    def test_get_list_and_shallow(self, test_session: Session):
        p1 = self._create_project(test_session)
        p2 = self._create_project(test_session)
        lst = projects_controller.get_list(db=test_session, skip=0, limit=100)
        ids = {str(i.id) for i in lst}
        assert str(p1.id) in ids and str(p2.id) in ids

        shallow = projects_controller.get_shallow_list(db=test_session, skip=0, limit=100)
        assert len(shallow) >= 2
        s = shallow[0]
        # base fields present
        assert s.id and s.name and s.version is not None
        # computed shallow fields
        assert hasattr(s, "document_count")
        assert hasattr(s, "has_documents")

    def test_update_success_and_conflict(self, test_session: Session):
        p1 = self._create_project(test_session)
        p2 = self._create_project(test_session)

        # update p1 name
        old_name = p1.name
        updated = projects_controller.update(
            db=test_session,
            project_id=p1.id,
            project_data=ProjectUpdate(name=f"updated-{uuid.uuid4().hex[:4]}")
        )
        assert updated.id == p1.id
        assert updated.name != old_name

        # conflict: set p1 name to p2 name
        with pytest.raises(HTTPException) as exc:
            projects_controller.update(
                db=test_session,
                project_id=p1.id,
                project_data=ProjectUpdate(name=p2.name)
            )
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST

    def test_summarize_statuses(self, test_session: Session):
        # AWAITING (no docs)
        pa = self._create_project(test_session)
        summ_a = projects_controller.summarize(db=test_session, project_id=pa.id)
        assert summ_a.status == ProjectStatus.AWAITING
        assert summ_a.document_count == 0

        # IN_PROGRESS (has doc but not all redacted)
        pi = self._create_project(test_session)
        d1 = self._create_document(test_session, pi.id)
        # Only original attached
        self._attach_original(test_session, d1, payload=b"%PDF-1.4 minimal")
        summ_i = projects_controller.summarize(db=test_session, project_id=pi.id)
        assert summ_i.status == ProjectStatus.IN_PROGRESS
        assert summ_i.document_count == 1
        assert summ_i.documents_with_original_files == 1
        assert summ_i.documents_with_redacted_files == 0

        # COMPLETED (all docs have redacted)
        pc = self._create_project(test_session)
        dc1 = self._create_document(test_session, pc.id)
        dc2 = self._create_document(test_session, pc.id)
        self._attach_redacted(test_session, dc1, payload=b"R1")
        self._attach_redacted(test_session, dc2, payload=b"R2")
        summ_c = projects_controller.summarize(db=test_session, project_id=pc.id)
        assert summ_c.status == ProjectStatus.COMPLETED
        assert summ_c.document_count == 2
        assert summ_c.documents_with_redacted_files == 2

    def test_delete_not_found_404(self, test_session: Session):
        # Direct controller call should raise 404 when project doesn't exist
        with pytest.raises(HTTPException) as exc:
            projects_controller.delete(db=test_session, project_id=uuid.UUID(int=0))
        assert exc.value.status_code == status.HTTP_404_NOT_FOUND

