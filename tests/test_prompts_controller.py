import uuid
import pytest
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.api.controllers import prompts_controller, projects_controller, documents_controller
from backend.api.schemas.projects_schema import ProjectCreate
from backend.api.schemas.documents_schema import DocumentCreate
from backend.api.schemas.prompts_schema import PromptCreate, PromptUpdate


class TestPromptsController:
    def _create_project_and_document(self, db: Session):
        proj = projects_controller.create(
            db=db,
            project_data=ProjectCreate(
                name=f"proj-{uuid.uuid4().hex[:6]}",
                description="desc",
                contact_name="tester",
                contact_email="tester@example.com",
                password="StrongPW!123",
            ),
        )
        doc = documents_controller.create(
            db=db,
            document_data=DocumentCreate(
                name=f"doc-{uuid.uuid4().hex[:6]}.pdf",
                description=None,
                project_id=proj.id,
            ),
        )
        return proj, doc

    def _create_prompt(self, db: Session, document_id) -> str:
        prompt = prompts_controller.create(
            db=db,
            prompt_data=PromptCreate(
                title="Test Title",
                prompt="Test prompt content",
                directive="general",
                document_id=document_id,
            ),
        )
        return prompt.id

    def test_create_and_get_prompt_success(self, test_session: Session):
        _, doc = self._create_project_and_document(test_session)
        created = prompts_controller.create(
            db=test_session,
            prompt_data=PromptCreate(
                title="Hello",
                prompt="World",
                directive="general",
                document_id=doc.id,
            ),
        )
        assert created.title == "Hello"
        got = prompts_controller.get(db=test_session, prompt_id=created.id)
        assert got.id == created.id
        assert got.title == "Hello"
        assert got.document_id == doc.id

    def test_list_prompts(self, test_session: Session):
        _, doc = self._create_project_and_document(test_session)
        ids = []
        for i in range(3):
            pid = self._create_prompt(test_session, doc.id)
            ids.append(pid)
        lst = prompts_controller.get_list(db=test_session, skip=0, limit=10)
        got_ids = {str(p.id) for p in lst}
        assert set(map(str, ids)).issubset(got_ids)

    def test_update_prompt_success_and_partial(self, test_session: Session):
        _, doc = self._create_project_and_document(test_session)
        pid = self._create_prompt(test_session, doc.id)

        updated = prompts_controller.update(
            db=test_session,
            prompt_id=pid,
            prompt_data=PromptUpdate(title="New Title"),
        )
        assert updated.title == "New Title"

        # partial update
        updated2 = prompts_controller.update(
            db=test_session,
            prompt_id=pid,
            prompt_data=PromptUpdate(prompt="Changed body"),
        )
        assert updated2.prompt == "Changed body"
        assert updated2.title == "New Title"  # preserved

    def test_delete_prompt_success_and_not_found(self, test_session: Session):
        _, doc = self._create_project_and_document(test_session)
        pid = self._create_prompt(test_session, doc.id)

        ok = prompts_controller.delete(db=test_session, prompt_id=pid)
        assert isinstance(ok.message, str) and ok.message

        with pytest.raises(HTTPException) as exc:
            prompts_controller.get(db=test_session, prompt_id=pid)
        assert exc.value.status_code == status.HTTP_404_NOT_FOUND

        # deleting non-existent
        with pytest.raises(HTTPException) as exc2:
            prompts_controller.delete(db=test_session, prompt_id=uuid.UUID(int=0))
        assert exc2.value.status_code == status.HTTP_404_NOT_FOUND

    def test_get_prompt_not_found(self, test_session: Session):
        with pytest.raises(HTTPException) as exc:
            prompts_controller.get(db=test_session, prompt_id=uuid.UUID(int=0))
        assert exc.value.status_code == status.HTTP_404_NOT_FOUND

    def test_create_prompt_nonexistent_document(self, test_session: Session):
        # Expect a database integrity error to bubble up
        with pytest.raises(Exception):
            prompts_controller.create(
                db=test_session,
                prompt_data=PromptCreate(
                    title="Oops",
                    prompt="No doc",
                    directive="general",
                    document_id=uuid.uuid4(),
                ),
            )

