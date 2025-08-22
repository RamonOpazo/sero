import uuid
from sqlalchemy import text

from backend.db.models import Project, Document, File, Prompt, Selection
from backend.db.types import UUIDBytes
from backend.api.enums import FileType


def test_uuidbytes_type():
    """Core type: UUIDBytes round-trip and factory."""
    generated_uuid = UUIDBytes.generate_uuid()
    assert isinstance(generated_uuid, uuid.UUID)

    # round-trip via process_result_value
    uuid_bytes = generated_uuid.bytes
    recovered_uuid = UUIDBytes().process_result_value(uuid_bytes, None)
    assert recovered_uuid == generated_uuid


def test_sqlite_database_models_and_relations(test_session):
    """Core DB models: basic CRUD and relations with SQLite test session."""
    # Create entities using current model fields
    project = Project(
        name="SQLite Test Project",
        description="Project for testing SQLite",
        version=1,
        contact_name="Tester",
        contact_email="tester@example.com",
        password_hash=b"hash",
    )
    document = Document(
        name="Test Document",
        description="Document description",
        tags=["test", "sqlite"],
        project=project,
    )
    file = File(
        document=document,
        file_type=FileType.ORIGINAL,
        mime_type="application/pdf",
        data=b"%PDF-1.4 minimal",
        salt=b"salty",
        file_hash="examplehash",
    )
    prompt = Prompt(
        document=document,
        title="Translate",
        prompt="Translate the content",
        directive="general",
        enabled=True,
    )
    selection = Selection(
        document=document,
        page_number=1,
        x=0.1,
        y=0.2,
        width=0.3,
        height=0.4,
        confidence=0.95,
        committed=False,
    )

    # Persist
    test_session.add_all([project, document, file, prompt, selection])
    test_session.commit()

    # Fetch and validate
    fetched_project = test_session.query(Project).filter_by(name="SQLite Test Project").first()
    assert fetched_project is not None and fetched_project.name == project.name

    # Validate UUID storage (raw bytes length 16 and equals ORM UUID bytes)
    raw_uuid = test_session.execute(text("SELECT id FROM projects WHERE name=:n"), {"n": project.name}).scalar()
    assert isinstance(raw_uuid, (bytes, bytearray)) and len(raw_uuid) == 16
    assert raw_uuid == fetched_project.id.bytes

    # Relations integrity and fields
    assert len(fetched_project.documents) == 1
    fetched_doc = fetched_project.documents[0]
    assert fetched_doc.name == document.name and set(fetched_doc.tags) == {"test", "sqlite"}

    assert len(fetched_doc.files) == 1
    fetched_file = fetched_doc.files[0]
    assert fetched_file.file_type == FileType.ORIGINAL and fetched_file.mime_type == "application/pdf"

    assert len(fetched_doc.prompts) == 1
    fetched_prompt = fetched_doc.prompts[0]
    assert fetched_prompt.title == "Translate" and fetched_prompt.enabled is True

    assert len(fetched_doc.selections) == 1
    fetched_sel = fetched_doc.selections[0]
    assert fetched_sel.page_number == 1 and fetched_sel.confidence == 0.95

