import uuid
import pytest
from sqlalchemy.orm import Session

from backend.core.security import security_manager
from backend.db.models import Project as ProjectModel, Document as DocumentModel, File as FileModel
from backend.api.enums import FileType, CommitState
from backend.api.schemas.documents_schema import DocumentCreate
from backend.api.schemas.prompts_schema import PromptCreate
from backend.api.schemas.selections_schema import SelectionCreate
from backend.core.pdf_redactor import generate_test_pdf


@pytest.mark.integration
def test_api_apply_ai_and_stage_selections(client, test_session: Session, monkeypatch):
    # Arrange: project + document + original file
    password = "$trongP455W0RD"
    proj = ProjectModel(
        name=f"proj-{uuid.uuid4().hex[:6]}",
        description="api-ai",
        contact_name="tester",
        contact_email="tester@example.com",
        password_hash=security_manager.hash_password(password).encode("utf-8"),
    )
    test_session.add(proj)
    test_session.commit()
    test_session.refresh(proj)

    payload = {"name": "api-ai.pdf", "description": None, "project_id": str(proj.id)}
    created = client.post("/api/documents", json=payload)
    assert created.status_code == 200
    doc_id = created.json()["id"]

    # Attach known original PDF via ORM for simplicity
    pdf_bytes = generate_test_pdf(text="API AI", pages=1)
    encrypted, salt = security_manager.encrypt_data(pdf_bytes, password)
    f = FileModel(
        file_hash=security_manager.generate_file_hash(pdf_bytes),
        file_type=FileType.ORIGINAL,
        mime_type="application/pdf",
        data=encrypted,
        salt=salt,
        document_id=doc_id,
    )
    test_session.add(f)
    test_session.commit()

    # Add two committed prompts via controller (simplify request shaping)
    from backend.api.controllers import documents_controller as dc
    from backend.api.schemas.prompts_schema import PromptCreate
    doc_uuid = uuid.UUID(doc_id)
    dc.add_prompt(db=test_session, document_id=doc_uuid, prompt_data=PromptCreate(title="Emails", prompt="Redact emails", directive="redact", state=CommitState.COMMITTED, document_id=doc_uuid))
    dc.add_prompt(db=test_session, document_id=doc_uuid, prompt_data=PromptCreate(title="SSNs", prompt="Redact SSNs", directive="redact", state=CommitState.COMMITTED, document_id=doc_uuid))

    # Mock AI service used by router/controller
    class FakeSvc:
        async def generate_selections(self, req):
            return type("Resp", (), {
                "selections": [
                    SelectionCreate(page_number=0, x=0.2, y=0.2, width=0.2, height=0.1, confidence=0.8, document_id=doc_id),
                    SelectionCreate(page_number=0, x=0.6, y=0.6, width=0.1, height=0.1, confidence=0.9, document_id=doc_id),
                ],
            })()

    monkeypatch.setattr("backend.service.ai_service.get_ai_service", lambda: FakeSvc())

    # Act: call API endpoint to apply AI and stage selections
    res = client.post(f"/api/documents/id/{doc_id}/ai/apply")

    # Assert: response is AiApplyResponse with two selections staged
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    assert "selections" in data and isinstance(data["selections"], list)
    assert len(data["selections"]) == 2
    for s in data["selections"]:
        assert s["state"].lower().startswith("staged")
        assert s["confidence"] is not None

