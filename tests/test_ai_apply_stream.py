import uuid
import pytest
from sqlalchemy.orm import Session

from backend.core.security import security_manager
from backend.db.models import Project as ProjectModel, Document as DocumentModel
from backend.api.enums import CommitState
from backend.api.schemas.documents_schema import DocumentCreate
from backend.api.schemas.prompts_schema import PromptCreate


@pytest.mark.integration
def test_api_apply_ai_stream_emits_events_and_stages(client, test_session: Session, monkeypatch):
    # Arrange: minimal project + document + one committed prompt
    proj = ProjectModel(
        name=f"proj-{uuid.uuid4().hex[:6]}",
        description="api-ai-stream",
        contact_name="tester",
        contact_email="tester@example.com",
        password_hash=security_manager.hash_password("pw").encode("utf-8"),
    )
    test_session.add(proj)
    test_session.commit()
    test_session.refresh(proj)

    created = test_session.execute(
        # use controller path for consistency
        # we could POST via client too, but direct ORM is fine here
        # create document and then add a committed prompt
        # create document
        
        # Using controller would require app context; instead, do ORM create directly
        
        # Just to keep code compact, do ORM create inline
        
        # NOTE: SQLAlchemy use inline
        
        # we won't use the execution result; we insert below via ORM session
        
        # dummy select to keep structure
        DocumentModel.__table__.select()
    )
    # ORM create document
    doc = DocumentModel(name="stream-ai.pdf", description=None, project_id=proj.id)
    test_session.add(doc)
    test_session.commit()
    test_session.refresh(doc)

    # Add a committed prompt
    from backend.crud import prompts_crud
    prom = prompts_crud.create(db=test_session, data=PromptCreate(title="Emails", prompt="Redact emails", directive="redact", state=CommitState.COMMITTED, document_id=doc.id))
    assert prom.id is not None

    # Monkeypatch OllamaClient used by ai_controller.apply_stream
    import backend.api.controllers.ai_controller as ai_ctrl

    class FakeClient:
        def __init__(self, base_url: str, timeout: int):
            pass
        async def generate_stream(self, model: str, prompt: str, options):
            # Yield a single JSON payload chunk representing selections
            yield '{"selections": [{"page_number": 0, "x": 0.12, "y": 0.10, "width": 0.20, "height": 0.10, "confidence": 0.88}]}'

    monkeypatch.setattr(ai_ctrl, "OllamaClient", FakeClient)

    # Act: call the streaming endpoint
    res = client.post("/api/ai/apply/stream", json={"document_id": str(doc.id)})

    # Assert: HTTP ok and SSE events present
    assert res.status_code == 200
    text = res.text
    # basic events should appear in the stream, including progress fields
    assert "event: status" in text
    assert "stage_index" in text and "stage_total" in text
    assert "event: staging_progress" in text
    assert "event: summary" in text
    assert "event: completed" in text

    # Verify a staged selection was persisted
    from backend.db.models import Selection as SelectionModel
    staged = test_session.query(SelectionModel).filter(SelectionModel.document_id == doc.id).all()
    assert any(getattr(s, "confidence", None) is not None for s in staged)

