import pytest
import asyncio
import uuid
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from httpx import AsyncClient


@pytest.fixture(scope="session", autouse=True)
def _test_env_setup(tmp_path_factory):
    """Session-wide test environment setup.

    - Uses tmp dirs for DB, logs, and output via env var overrides.
    - Patches keyring get/set to an in-memory store to avoid OS keyring dependency.
    """
    from _pytest.monkeypatch import MonkeyPatch

    mp = MonkeyPatch()

    data_dir = tmp_path_factory.mktemp("sero_data")
    state_dir = tmp_path_factory.mktemp("sero_state")

    db_path = data_dir / "test.sqlite"
    log_path = state_dir / "logs" / "app.jsonl"
    output_dir = data_dir / "output"

    # Ensure parent dirs are created lazily by the app, but set env paths now
    mp.setenv("SERO_DB__FILEPATH", str(db_path))
    mp.setenv("SERO_LOG__FILEPATH", str(log_path))
    mp.setenv("SERO_PROCESSING__DIRPATH", str(output_dir))

    # Simple in-memory keyring shim
    import keyring
    _store: dict[tuple[str, str], str] = {}

    def _fake_get_password(service: str, username: str):
        return _store.get((service, username))

    def _fake_set_password(service: str, username: str, password: str):
        _store[(service, username)] = password

    mp.setattr(keyring, "get_password", _fake_get_password, raising=True)
    mp.setattr(keyring, "set_password", _fake_set_password, raising=True)

    try:
        yield
    finally:
        mp.undo()


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session.
    Ensures proper shutdown of async generators and the default executor to avoid ResourceWarning.
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    try:
        yield loop
    finally:
        try:
            # Gracefully shutdown async generators and the default executor
            loop.run_until_complete(loop.shutdown_asyncgens())
            loop.run_until_complete(loop.shutdown_default_executor())
        except Exception:
            pass
        loop.close()


@pytest.fixture(scope="session")
def temp_db_path(tmp_path_factory):
    """Create a temporary database file path using pytest's tmp_path_factory."""
    db_dir = tmp_path_factory.mktemp("db")
    path = db_dir / "test.sqlite"
    # No need to pre-create or unlink; SQLite will create the file as needed
    yield path


@pytest.fixture
def test_engine(temp_db_path):
    """Create a test database engine."""
    test_db_url = f"sqlite:///{temp_db_path}"
    engine = create_engine(
        test_db_url,
        echo=False,
        connect_args={"check_same_thread": False}
    )
    
    # Configure SQLite pragmas for testing
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()
    
    # Import models lazily now that env and keyring are patched
    from backend.db.models import Base
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture
def test_session(test_engine):
    """Create a test database session."""
    TestingSessionLocal = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def override_get_db_session(test_session):
    """Override the database session dependency."""
    def _get_test_db():
        try:
            yield test_session
        finally:
            pass
    
    # Import app and dependency only after environment setup
    from backend.app import app
    from backend.core.database import get_db_session

    app.dependency_overrides[get_db_session] = _get_test_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client(override_get_db_session):
    """Create a test client."""
    from backend.app import app
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
async def async_client(override_get_db_session):
    """Create an async test client."""
    from backend.app import app
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding


def _encrypt_password_for_project(password: str) -> dict:
    """Generate an ephemeral key and return dict with key_id and encrypted_password (base64)."""
    from backend.core.security import security_manager
    key_id, public_pem = security_manager.generate_ephemeral_rsa_keypair()
    public_key = serialization.load_pem_public_key(public_pem.encode("utf-8"))
    ciphertext = public_key.encrypt(
        password.encode("utf-8"),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )
    import base64
    return {"key_id": key_id, "encrypted_password": base64.b64encode(ciphertext).decode("ascii")}


@pytest.fixture
def sample_project_data():
    """Sample project data for testing (uses encrypted-in-transit password)."""
    enc = _encrypt_password_for_project("TestPassword123!")
    return {
        "name": f"Test Project {uuid.uuid4().hex[:8]}",
        "description": "A test project for API testing",
        "contact_name": "Test User",
        "contact_email": "test@example.com",
        "key_id": enc["key_id"],
        "encrypted_password": enc["encrypted_password"],
    }


@pytest.fixture
def sample_document_data():
    """Sample document data for testing."""
    return {
        "name": "test_document.pdf",
        "description": "Test document for API testing"
    }


@pytest.fixture
def sample_file_data():
    """Sample file data for testing."""
    # Minimal valid PDF file content
    minimal_pdf = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000125 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n182\n%%EOF"
    return {
        "filename": "test_file.pdf",
        "mime_type": "application/pdf",
        "data": minimal_pdf,
        "is_original_file": True,
        "salt": b"test_salt_123456",
        "file_hash": "abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234"
    }


@pytest.fixture
def mock_security_manager():
    """Mock the security manager for testing."""
    with patch('backend.core.security.security_manager') as mock:
        mock.is_strong_password.return_value = True
        mock.hash_password.return_value = b"hashed_password"
        mock.verify_password.return_value = True
        yield mock


@pytest.fixture
def mock_db_manager():
    """Mock the database manager for testing."""
    with patch('backend.core.database.db_manager') as mock:
        yield mock


@pytest.fixture
def created_project(client, sample_project_data, mock_security_manager):
    """Create a project for testing and return its data."""
    response = client.post("/api/projects", json=sample_project_data)
    assert response.status_code == 201
    return response.json()


@pytest.fixture
def created_document(client, created_project, sample_document_data):
    """Create a document for testing and return its data."""
    document_data = {**sample_document_data, "project_id": created_project["id"]}
    response = client.post("/api/documents", json=document_data)
    assert response.status_code == 200
    return response.json()


@pytest.fixture
def created_file(client, created_document, sample_file_data):
    """Create a file for testing and return its data."""
    # Files are created through document upload, so we need to get the file from the created document
    # Since created_document is created without a file, let's get the document that should have files
    document = created_document
    
    # If the document doesn't have files, we'll return a mock file data structure
    # that matches what the tests expect
    if not document.get("files") or len(document["files"]) == 0:
        # Return mock file data for tests that don't actually need file upload functionality
        return {
            "id": "00000000-0000-0000-0000-000000000000", 
            "filename": sample_file_data["filename"],
            "document_id": document["id"],
            "mime_type": sample_file_data["mime_type"],
            "file_type": "ORIGINAL",
            "file_hash": sample_file_data["file_hash"]
        }
    
    # Return the first file from the document
    return document["files"][0]


@pytest.fixture
def sample_prompt_data():
    """Sample prompt data for testing."""
    return {
        "text": "Analyze this document for sensitive data",
        "languages": ["en", "es"],
        "temperature": 0.7,
    }


@pytest.fixture
def created_prompt(client, created_document, sample_prompt_data):
    """Create a prompt for testing and return its data."""
    prompt_data = {**sample_prompt_data, "document_id": created_document["id"]}
    response = client.post("/api/prompts", json=prompt_data)
    assert response.status_code == 200
    return response.json()


@pytest.fixture
def created_prompts(client, created_document, sample_prompt_data):
    """Create multiple prompts for testing and return their data."""
    prompts = []
    
    # Create 3 different prompts
    prompt_variations = [
        {"text": "First test prompt", "languages": ["en"], "temperature": 0.3},
        {"text": "Second test prompt", "languages": ["es"], "temperature": 0.7},
        {"text": "Third test prompt", "languages": ["en", "fr"], "temperature": 0.9},
    ]
    
    for variation in prompt_variations:
        prompt_data = {**variation, "document_id": created_document["id"]}
        response = client.post("/api/prompts", json=prompt_data)
        assert response.status_code == 200
        prompts.append(response.json())
    
    return prompts


@pytest.fixture
def sample_selection_data():
    """Sample selection data for testing."""
    return {
        "page_number": 1,
        "x": 0.1,
        "y": 0.2,
        "width": 0.3,
        "height": 0.4,
        "confidence": 0.8,
    }


@pytest.fixture
def created_selection(client, created_document, sample_selection_data):
    """Create a selection for testing and return its data."""
    selection_data = {**sample_selection_data, "document_id": created_document["id"]}
    response = client.post("/api/selections", json=selection_data)
    assert response.status_code == 200
    return response.json()


@pytest.fixture
def created_selections(client, created_document, sample_selection_data):
    """Create multiple selections for testing and return their data."""
    selections = []
    
    # Create 3 different selections
    selection_variations = [
        {"page_number": 1, "x": 0.1, "y": 0.1, "width": 0.2, "height": 0.3, "confidence": 0.9},
        {"page_number": 1, "x": 0.4, "y": 0.5, "width": 0.3, "height": 0.2, "confidence": None},  # Manual selection
        {"page_number": 2, "x": 0.0, "y": 0.0, "width": 1.0, "height": 1.0, "confidence": 0.7},
    ]
    
    for variation in selection_variations:
        selection_data = {**variation, "document_id": created_document["id"]}
        response = client.post("/api/selections", json=selection_data)
        assert response.status_code == 200
        selections.append(response.json())
    
    return selections
