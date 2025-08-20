import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.db.models import Selection


class TestSelectionsAPI:
    """Test suite for selections API endpoints."""
    
    def test_create_selection_success(
        self,
        client: TestClient,
        test_session: Session,
        created_project,
        created_document,
    ):
        """Test successful selection creation."""
        selection_data = {
            "page_number": 1,
            "x": 0.1,
            "y": 0.2,
            "width": 0.3,
            "height": 0.4,
            "confidence": 0.8,
            "document_id": created_document["id"],
        }
        
        response = client.post("/api/selections", json=selection_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["page_number"] == selection_data["page_number"]
        assert data["x"] == selection_data["x"]
        assert data["y"] == selection_data["y"]
        assert data["width"] == selection_data["width"]
        assert data["height"] == selection_data["height"]
        assert data["confidence"] == selection_data["confidence"]
        assert data["document_id"] == selection_data["document_id"]
        assert data["is_ai_generated"] == True  # Because confidence is not None
        assert "id" in data
        assert "created_at" in data
        
    def test_create_selection_manual(
        self,
        client: TestClient,
        created_document,
    ):
        """Test manual selection creation (no confidence score)."""
        selection_data = {
            "page_number": 2,
            "x": 0.0,
            "y": 0.0,
            "width": 1.0,
            "height": 1.0,
            "confidence": None,
            "document_id": created_document["id"],
        }
        
        response = client.post("/api/selections", json=selection_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["confidence"] is None
        assert data["is_ai_generated"] == False  # Because confidence is None
        
    def test_list_selections_empty(self, client: TestClient):
        """Test listing selections when none exist."""
        response = client.get("/api/selections")
        assert response.status_code == 200
        
        data = response.json()
        assert data == []
        
    def test_create_selection_invalid_coordinates(
        self,
        client: TestClient,
        created_document,
    ):
        """Test selection creation with invalid coordinate values."""
        # X coordinate too low
        selection_data = {
            "page_number": 1,
            "x": -0.1,
            "y": 0.2,
            "width": 0.3,
            "height": 0.4,
            "document_id": created_document["id"],
        }
        
        response = client.post("/api/selections", json=selection_data)
        assert response.status_code == 422
        
        # Width too large
        selection_data["x"] = 0.1
        selection_data["width"] = 1.5
        response = client.post("/api/selections", json=selection_data)
        assert response.status_code == 422
        
    def test_create_selection_nonexistent_document(self, client: TestClient):
        """Test selection creation with non-existent document ID."""
        nonexistent_id = uuid4()
        selection_data = {
            "page_number": 1,
            "x": 0.1,
            "y": 0.2,
            "width": 0.3,
            "height": 0.4,
            "document_id": str(nonexistent_id),
        }
        
        response = client.post("/api/selections", json=selection_data)
        # This should succeed at API level but will fail at database level
        # due to foreign key constraint
        assert response.status_code in [400, 500]
        
    def test_get_selection_by_id_success(
        self,
        client: TestClient,
        created_selection,
    ):
        """Test successful retrieval of selection by ID."""
        response = client.get(f"/api/selections/id/{created_selection['id']}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == created_selection["id"]
        assert data["page_number"] == created_selection["page_number"]
        assert data["x"] == created_selection["x"]
        assert data["y"] == created_selection["y"]
        assert data["width"] == created_selection["width"]
        assert data["height"] == created_selection["height"]
        assert data["confidence"] == created_selection["confidence"]
        assert data["document_id"] == created_selection["document_id"]
        
    def test_get_selection_by_id_not_found(self, client: TestClient):
        """Test retrieval of non-existent selection."""
        nonexistent_id = uuid4()
        response = client.get(f"/api/selections/id/{nonexistent_id}")
        assert response.status_code == 404
        
        data = response.json()
        assert "not found" in data["detail"].lower()
        
    def test_get_selection_by_id_invalid_uuid(self, client: TestClient):
        """Test retrieval with invalid UUID format."""
        response = client.get("/api/selections/id/invalid-uuid")
        assert response.status_code == 422
        
    def test_list_selections_success(
        self,
        client: TestClient,
        created_selections,
    ):
        """Test successful listing of selections."""
        response = client.get("/api/selections")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == len(created_selections)
        
        # Verify selections are ordered by created_at desc
        selection_ids = [s["id"] for s in data]
        expected_ids = [s["id"] for s in reversed(created_selections)]  # Reversed because created_selections are in creation order
        assert selection_ids == expected_ids
        
    def test_update_selection_success(
        self,
        client: TestClient,
        created_selection,
    ):
        """Test successful selection update."""
        update_data = {
            "page_number": 5,
            "x": 0.2,
            "y": 0.3,
            "width": 0.4,
            "height": 0.5,
            "confidence": 0.9,
        }
        
        response = client.put(f"/api/selections/id/{created_selection['id']}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == created_selection["id"]
        assert data["page_number"] == update_data["page_number"]
        assert data["x"] == update_data["x"]
        assert data["y"] == update_data["y"]
        assert data["width"] == update_data["width"]
        assert data["height"] == update_data["height"]
        assert data["confidence"] == update_data["confidence"]
        assert data["document_id"] == created_selection["document_id"]
        assert "updated_at" in data
        
    def test_update_selection_partial(
        self,
        client: TestClient,
        created_selection,
    ):
        """Test partial selection update."""
        update_data = {"x": 0.5, "y": 0.6}
        
        response = client.put(f"/api/selections/id/{created_selection['id']}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["x"] == update_data["x"]
        assert data["y"] == update_data["y"]
        # Other fields should remain unchanged
        assert data["width"] == created_selection["width"]
        assert data["height"] == created_selection["height"]
        assert data["page_number"] == created_selection["page_number"]
        
    def test_update_selection_not_found(self, client: TestClient):
        """Test updating non-existent selection."""
        nonexistent_id = uuid4()
        update_data = {"x": 0.5}
        
        response = client.put(f"/api/selections/id/{nonexistent_id}", json=update_data)
        assert response.status_code == 404
        
        data = response.json()
        assert "not found" in data["detail"].lower()
        
    def test_delete_selection_success(
        self,
        client: TestClient,
        created_selection,
    ):
        """Test successful selection deletion."""
        response = client.delete(f"/api/selections/id/{created_selection['id']}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"]
        assert created_selection['id'] in data["message"]
        
        # Verify selection is actually deleted
        get_response = client.get(f"/api/selections/id/{created_selection['id']}")
        assert get_response.status_code == 404
        
    def test_delete_selection_not_found(self, client: TestClient):
        """Test deleting non-existent selection."""
        nonexistent_id = uuid4()
        response = client.delete(f"/api/selections/id/{nonexistent_id}")
        assert response.status_code == 404
        
        data = response.json()
        assert "not found" in data["detail"].lower()
