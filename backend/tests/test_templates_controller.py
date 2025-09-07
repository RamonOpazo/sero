import uuid
import pytest
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.api.controllers import projects_controller, documents_controller
from src.api.schemas.templates_schema import TemplateUpdate
from src.core.security import security_manager
from src.db.models import Project as ProjectModel, Document as DocumentModel, Template as TemplateModel


class TestTemplateMapping:
    def _create_project(self, db: Session) -> ProjectModel:
        proj = ProjectModel(
            name=f"proj-{uuid.uuid4().hex[:6]}",
            description=None,
            contact_name="tester",
            contact_email="tester@example.com",
            password_hash=security_manager.hash_password("StrongPW!123").encode("utf-8"),
        )
        db.add(proj)
        db.commit()
        db.refresh(proj)
        return proj

    def _create_document(self, db: Session, project_id) -> DocumentModel:
        doc = DocumentModel(name=f"doc-{uuid.uuid4().hex[:6]}.pdf", description=None, project_id=project_id)
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc

    def test_set_get_replace_and_clear_template(self, test_session: Session):
        proj = self._create_project(test_session)
        d1 = self._create_document(test_session, proj.id)
        d2 = self._create_document(test_session, proj.id)

        # Initially 404
        with pytest.raises(HTTPException) as e404:
            projects_controller.get_template(db=test_session, project_id=proj.id)
        assert e404.value.status_code == status.HTTP_404_NOT_FOUND

        # Set template to d1
        t1 = projects_controller.set_template(db=test_session, project_id=proj.id, data=TemplateUpdate(document_id=d1.id))
        assert t1.project_id == proj.id and t1.document_id == d1.id

        # Get returns same
        got = projects_controller.get_template(db=test_session, project_id=proj.id)
        assert got.id and got.document_id == d1.id

        # Replace with d2
        t2 = projects_controller.set_template(db=test_session, project_id=proj.id, data=TemplateUpdate(document_id=d2.id))
        assert t2.document_id == d2.id

        # Only one template row exists
        rows = test_session.query(TemplateModel).filter(TemplateModel.project_id == proj.id).all()
        assert len(rows) == 1 and rows[0].document_id == d2.id

        # Clear
        ok = projects_controller.clear_template(db=test_session, project_id=proj.id)
        assert "Cleared" in ok.message
        with pytest.raises(HTTPException):
            projects_controller.get_template(db=test_session, project_id=proj.id)

    def test_set_template_with_document_controller(self, test_session: Session):
        proj = self._create_project(test_session)
        doc = self._create_document(test_session, proj.id)
        tpl = documents_controller.set_as_project_template(db=test_session, document_id=doc.id)
        assert tpl.project_id == proj.id and tpl.document_id == doc.id

    def test_set_template_wrong_project_400(self, test_session: Session):
        p1 = self._create_project(test_session)
        p2 = self._create_project(test_session)
        d_other = self._create_document(test_session, p2.id)
        with pytest.raises(HTTPException) as e400:
            projects_controller.set_template(db=test_session, project_id=p1.id, data=TemplateUpdate(document_id=d_other.id))
        assert e400.value.status_code == status.HTTP_400_BAD_REQUEST
