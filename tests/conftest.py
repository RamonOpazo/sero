import pytest
import asyncio
import tempfile
import uuid
from pathlib import Path
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from httpx import AsyncClient

from backend.app import app
from backend.core.database import get_db_session
from backend.db.models import Base
from backend.core.config import settings


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
    fd, path = tempfile.mkstemp(suffix=".duckdb")
    os.close(fd)  # Close the file descriptor immediately
    os.unlink(path)  # Remove the empty file so DuckDB can create it properly
    yield Path(path)
    Path(path).unlink(missing_ok=True)


@pytest.fixture
def test_engine(temp_db_path):
    """Create a test database engine."""
    test_db_url = f"duckdb:///{temp_db_path}"
    engine = create_engine(test_db_url, echo=False)
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
        "description": "Test document for API testing",
        "status": "pending"
    }


@pytest.fixture
def sample_file_data():
    """Sample file data for testing."""
    return {
        "filename": "test_file.pdf",
        "mime_type": "application/pdf",
        "data": b"Sample PDF content for testing",
        "is_original_file": True,
        "salt": b"test_salt_123456",
        "file_hash": "abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234"
    }


@pytest.fixture
def mock_security_manager():
    """Mock the security manager for testing."""
    with patch('sero.core.security.security_manager') as mock:
        mock.is_strong_password.return_value = True
        mock.hash_password.return_value = b"hashed_password"
        mock.verify_password.return_value = True
        yield mock


@pytest.fixture
def mock_db_manager():
    """Mock the database manager for testing."""
    with patch('sero.core.database.db_manager') as mock:
        yield mock


@pytest.fixture
def created_project(client, sample_project_data, mock_security_manager):
    """Create a project for testing and return its data."""
    response = client.post("/api/projects/", json=sample_project_data)
    assert response.status_code == 201
    return response.json()


@pytest.fixture
def created_document(client, created_project, sample_document_data):
    """Create a document for testing and return its data."""
    document_data = {**sample_document_data, "project_id": created_project["id"]}
    response = client.post("/api/documents/", json=document_data)
    assert response.status_code == 200
    return response.json()


@pytest.fixture
def created_file(client, created_document, sample_file_data):
    """Create a file for testing and return its data."""
    import base64
    file_data = {**sample_file_data, "document_id": created_document["id"]}
    # Convert bytes to base64 strings for JSON serialization
    file_data["data"] = base64.b64encode(file_data["data"]).decode()
    file_data["salt"] = base64.b64encode(file_data["salt"]).decode()
    
    response = client.post("/api/files/", json=file_data)
    assert response.status_code == 200
    return response.json()
