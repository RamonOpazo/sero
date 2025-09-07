import uuid
import pytest
from sqlalchemy.orm import Session

from src.core.security import security_manager
from src.db.models import Project as ProjectModel, Document as DocumentModel
from src.api.enums import CommitState
from src.api.schemas.prompts_schema import PromptCreate


@pytest.mark.integration
def test_api_apply_project_stream_emits_project_events_and_stages(client, test_session: Session, monkeypatch):
    # Arrange: project with 2 documents, each with a committed prompt
    proj = ProjectModel(
        name=f"proj-{uuid.uuid4().hex[:6]}",
        description="api-ai-project-stream",
        contact_name="tester",
        contact_email="tester@example.com",
        password_hash=security_manager.hash_password("pw").encode("utf-8"),
    )
    test_session.add(proj)
    test_session.commit()
    test_session.refresh(proj)

    docs = []
    for i in range(2):
        d = DocumentModel(name=f"doc-{i}.pdf", description=None, project_id=proj.id)
        test_session.add(d)
        test_session.commit()
        test_session.refresh(d)
        docs.append(d)

    from src.crud import prompts_crud
    for d in docs:
        _ = prompts_crud.create(db=test_session, data=PromptCreate(title="Emails", prompt="Redact emails", directive="redact", state=CommitState.COMMITTED, document_id=d.id))

    # Monkeypatch OllamaClient used by ai_controller.apply_project_stream
    from src.api.controllers import ai_controller

    class FakeClient:
        def __init__(self, base_url: str, timeout: int):
            pass
        async def generate_stream(self, model: str, prompt: str, options):
            yield '{"selections": [{"page_number": 0, "x": 0.1, "y": 0.1, "width": 0.1, "height": 0.1, "confidence": 0.9}]}'

    monkeypatch.setattr(ai_controller, "OllamaClient", FakeClient)

    # Act
    res = client.post("/api/ai/apply/project/stream", json={"project_id": str(proj.id)})

    # Assert project-level events and staging
    assert res.status_code == 200
    text = res.text
    assert "event: project_init" in text
    assert "event: project_progress" in text
    assert "event: project_doc_start" in text
    assert "event: project_doc_summary" in text
    assert "event: completed" in text

    # Verify staged selections exist for both documents
    from src.db.models import Selection as SelectionModel
    for d in docs:
        staged = test_session.query(SelectionModel).filter(SelectionModel.document_id == d.id).all()
        assert any(getattr(s, "confidence", None) is not None for s in staged)

