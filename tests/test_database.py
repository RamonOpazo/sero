import uuid
from sqlalchemy import text
from backend.db.models import Project, Document, File, Prompt, Selection
from backend.db.types import UUIDBytes


def test_uuidbytes_type():
    """Test UUIDBytes type handling."""
    # Test UUID creation
    generated_uuid = UUIDBytes.generate_uuid()
    assert isinstance(generated_uuid, uuid.UUID)

    # Test conversion to and from bytes
    uuid_bytes = generated_uuid.bytes
    recovered_uuid = UUIDBytes().process_result_value(uuid_bytes, None)
    assert recovered_uuid == generated_uuid


def test_sqlite_database(temp_db_path, test_engine, test_session):
    """Test migrating data to SQLite and CRUD operations."""
    # Create entities
    project = Project(
        name="SQLite Test Project",
        description="Project for testing SQLite migration",
        version=1,
        contact_name="Tester",
        contact_email="tester@example.com",
        password_hash=b"hash"
    )
    document = Document(
        project=project,
        description="Document description",
        status="active"
    )
    file = File(
        document=document,
        filename="example.pdf",
        mime_type="application/pdf",
        data=b"PDF data",
        is_original_file=True,
        salt=b"salty",
        file_hash="examplehash"
    )
    prompt = Prompt(
        file=file,
        label="Prompt",
        text="Translate",
        languages=["en"],
        temperature=0.9
    )
    selection = Selection(
        file=file,
        label="Selection",
        page_number=1,
        x=0.1,
        y=0.2,
        width=0.3,
        height=0.4,
        confidence=0.95
    )

    # Add entities to session
    test_session.add_all([project, document, file, prompt, selection])
    test_session.commit()

    # Fetch data
    fetched_project = test_session.query(Project).filter_by(name="SQLite Test Project").first()
    assert fetched_project is not None
    assert fetched_project.name == "SQLite Test Project"

    # Validate UUID storage
    raw_uuid = test_session.execute(
        text("SELECT id FROM projects WHERE name='SQLite Test Project'")
    ).scalar()
    assert raw_uuid == fetched_project.id.bytes

    # Ensure relationships
    assert document in fetched_project.documents
    assert file in document.files
    assert prompt in file.prompts
    assert selection in file.selections
    assert prompt.languages == ["en"]

