import os
import uuid
import pytest

from sqlalchemy.orm import Session

from backend.service.ai_service import OllamaAiService
from backend.api.controllers import documents_controller, projects_controller
from backend.api.schemas.documents_schema import DocumentCreate
from backend.api.schemas.settings_schema import AiSettingsUpdate
from backend.api.schemas.prompts_schema import PromptCreate
from backend.core.security import security_manager
from backend.db.models import Project as ProjectModel, Document as DocumentModel, File as FileModel
from backend.api.enums import FileType, CommitState
from backend.core.pdf_redactor import generate_test_pdf


@pytest.mark.integration
def test_ollama_health_and_generate_selections_live(test_session: Session):
    # 1) Check live Ollama availability; skip if not reachable
    svc = OllamaAiService()
    import asyncio
    ok = asyncio.run(svc.health())
    if not ok:
        pytest.skip("Ollama is not reachable on configured host; skipping live integration test")

    # 2) Discover available models and set project AI settings accordingly
    catalog = asyncio.run(svc.catalog())
    models = []
    for p in catalog.providers:
        if p.name == "ollama":
            models = p.models
            break
    selected_model = models[0] if models else None

    # 3) Create project/document and attach a known PDF
    password = "$trongP455W0RD"
    proj = ProjectModel(
        name=f"live-{uuid.uuid4().hex[:6]}",
        description="ollama-live",
        contact_name="tester",
        contact_email="tester@example.com",
        password_hash=security_manager.hash_password(password).encode("utf-8"),
    )
    test_session.add(proj)
    test_session.commit()
    test_session.refresh(proj)

    # Update AI settings with discovered model if any
    if selected_model:
        _ = projects_controller.update_ai_settings(db=test_session, project_id=proj.id, data=AiSettingsUpdate(model_name=selected_model))

    created = documents_controller.create(db=test_session, document_data=DocumentCreate(name="ollama-live.pdf", description=None, project_id=proj.id))
    doc = test_session.query(DocumentModel).filter(DocumentModel.id == created.id).first()

    pdf_bytes = generate_test_pdf(text="SERO LIVE OLLAMA", pages=1)
    encrypted, salt = security_manager.encrypt_data(pdf_bytes, password)
    f = FileModel(
        file_hash=security_manager.generate_file_hash(pdf_bytes),
        file_type=FileType.ORIGINAL,
        mime_type="application/pdf",
        data=encrypted,
        salt=salt,
        document_id=doc.id,
    )
    test_session.add(f)
    test_session.commit()

    # 4) Add a committed prompt that instructs the model to return explicit JSON
    json_sample = '{"selections": [{"page_number": 0, "x": 0.1, "y": 0.1, "width": 0.1, "height": 0.1, "confidence": 0.99}]}'
    prompt_text = (
        "Return STRICT JSON only, no prose. Exactly this content or a superset valid per schema: "
        + json_sample
    )
    documents_controller.add_prompt(
        db=test_session,
        document_id=doc.id,
        prompt_data=PromptCreate(title="Static JSON", prompt=prompt_text, directive="redact", state=CommitState.COMMITTED, document_id=doc.id),
    )

    # 5) Invoke live AI flow and stage selections
    out = documents_controller.apply_ai_and_stage(db=test_session, document_id=doc.id)

    # 6) Assert we got a response; optionally require at least one selection based on env flag
    assert out is not None
    require_non_empty = os.environ.get("SERO_OLLAMA_REQUIRE_SELECTIONS", "0") == "1"
    if require_non_empty:
        assert len(out.selections) >= 1, "Expected Ollama to return at least one selection"
    else:
        # Even if zero due to model variance, reaching this point proves connectivity and end-to-end flow
        assert isinstance(out.selections, list)

