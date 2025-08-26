import uuid
from sqlalchemy.orm import Session

from backend.core.security import security_manager
from backend.db.models import Project as ProjectModel, Document as DocumentModel, File as FileModel, Selection as SelectionModel
from backend.api.enums import FileType, CommitState, ScopeType
from backend.api.controllers import documents_controller
from backend.api.schemas.documents_schema import DocumentCreate
from backend.api.schemas.prompts_schema import PromptCreate
from backend.api.schemas.selections_schema import SelectionCreate
from backend.core.pdf_redactor import generate_test_pdf


def test_document_scoped_ai_integration(test_session: Session, monkeypatch):
    # 1) Create a project with known password
    password = "$trongP455W0RD"
    proj = ProjectModel(
        name=f"proj-{uuid.uuid4().hex[:6]}",
        description="integration",
        contact_name="tester",
        contact_email="tester@example.com",
        password_hash=security_manager.hash_password(password).encode("utf-8"),
    )
    test_session.add(proj)
    test_session.commit()
    test_session.refresh(proj)

    # 2) Create a document under this project
    created = documents_controller.create(db=test_session, document_data=DocumentCreate(name="ai-int.pdf", description=None, project_id=proj.id))
    doc = test_session.query(DocumentModel).filter(DocumentModel.id == created.id).first()

    # 3) Generate a known PDF and attach as ORIGINAL (encrypted with project password)
    pdf_bytes = generate_test_pdf(text="SERO AI INTEGRATION", pages=1)
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

    # 4) Add a couple of manual selections (committed)
    s1 = SelectionModel(document_id=doc.id, x=0.10, y=0.10, width=0.20, height=0.15, page_number=0, scope=ScopeType.DOCUMENT, state=CommitState.COMMITTED, confidence=None)
    s2 = SelectionModel(document_id=doc.id, x=0.50, y=0.50, width=0.10, height=0.10, page_number=0, scope=ScopeType.DOCUMENT, state=CommitState.COMMITTED, confidence=None)
    test_session.add_all([s1, s2])
    test_session.commit()

    # 5) Add two committed prompts
    documents_controller.add_prompt(
        db=test_session,
        document_id=doc.id,
        prompt_data=PromptCreate(title="Mask emails", prompt="Find and redact email addresses", directive="redact", state=CommitState.COMMITTED, document_id=doc.id),
    )
    documents_controller.add_prompt(
        db=test_session,
        document_id=doc.id,
        prompt_data=PromptCreate(title="Mask SSNs", prompt="Find and redact SSN patterns", directive="redact", state=CommitState.COMMITTED, document_id=doc.id),
    )

    # 6) Mock AI service to return deterministic AI selections
    class FakeSvc:
        async def generate_selections(self, req):
            # produce two AI selections on page 0 with confidence
            return type("Resp", (), {
                "selections": [
                    SelectionCreate(page_number=0, x=0.15, y=0.15, width=0.10, height=0.08, confidence=0.80, document_id=doc.id),
                    SelectionCreate(page_number=0, x=0.60, y=0.60, width=0.15, height=0.12, confidence=0.90, document_id=doc.id),
                ],
            })()

    monkeypatch.setattr("backend.service.ai_service.get_ai_service", lambda: FakeSvc())

    # 7) Apply AI and stage selections
    out = documents_controller.apply_ai_and_stage(db=test_session, document_id=doc.id)

    # 8) Assertions: ensure AI selections exist and are staged
    assert out.selections and len(out.selections) == 2
    for sel in out.selections:
        # AI-generated implies confidence present
        assert sel.is_ai_generated is True
        # Staged, not committed yet
        assert sel.state == CommitState.STAGED_CREATION
        # Geometry normalized and within bounds
        assert 0.0 <= sel.x <= 1.0 and 0.0 <= sel.y <= 1.0
        assert 0.0 <= sel.width <= 1.0 and 0.0 <= sel.height <= 1.0

    # Ensure DB has staged selections persisted
    staged = [s for s in test_session.query(SelectionModel).filter(SelectionModel.document_id == doc.id).all() if s.state == CommitState.STAGED_CREATION]
    assert len(staged) == 2

