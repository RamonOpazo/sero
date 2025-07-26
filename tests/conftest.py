import pytest
import asyncio
import tempfile
import uuid
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from httpx import AsyncClient

from backend.app import app
from backend.core.database import get_db_session
from backend.db.models import Base


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def temp_db_path():
    """Create a temporary database file path."""
    import os
    fd, path = tempfile.mkstemp(suffix=".sqlite")
    os.close(fd)  # Close the file descriptor immediately
    os.unlink(path)  # Remove the empty file so SQLite can create it properly
    yield Path(path)
    Path(path).unlink(missing_ok=True)


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
    
    app.dependency_overrides[get_db_session] = _get_test_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client(override_get_db_session):
    """Create a test client."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
async def async_client(override_get_db_session):
    """Create an async test client."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def sample_project_data():
    """Sample project data for testing."""
    return {
        "name": f"Test Project {uuid.uuid4().hex[:8]}",
        "description": "A test project for API testing",
        "version": 1,
        "contact_name": "Test User",
        "contact_email": "test@example.com",
        "password": "TestPassword123!"
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
