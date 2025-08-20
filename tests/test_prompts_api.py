import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.db.models import Prompt


class TestPromptsAPI:
    """Test suite for prompts API endpoints."""
    
    def test_create_prompt_success(
        self,
        client: TestClient,
        test_session: Session,
        created_project,
        created_document,
    ):
        """Test successful prompt creation."""
        prompt_data = {
            "text": "Analyze this document for sensitive data",
            "languages": ["en", "es"],
            "temperature": 0.7,
            "document_id": created_document["id"],
        }
        
        response = client.post("/api/prompts", json=prompt_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["text"] == prompt_data["text"]
        assert data["languages"] == prompt_data["languages"]
        assert data["temperature"] == prompt_data["temperature"]
        assert data["document_id"] == prompt_data["document_id"]
        assert "id" in data
        assert "created_at" in data
        
    def test_create_prompt_with_custom_id(
        self,
        client: TestClient,
        test_session: Session,
        created_project,
        created_document,
    ):
        """Test prompt creation with custom UUID."""
        custom_id = uuid4()
        prompt_data = {
            "id": str(custom_id),
            "text": "Custom ID prompt",
            "languages": ["en"],
            "temperature": 0.5,
            "document_id": created_document["id"],
        }
        
        response = client.post("/api/prompts", json=prompt_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == str(custom_id)
        assert data["text"] == prompt_data["text"]
        
    def test_create_prompt_invalid_temperature(
        self,
        client: TestClient,
        created_document,
    ):
        """Test prompt creation with invalid temperature values."""
        # Temperature too low
        prompt_data = {
            "text": "Test prompt",
            "languages": ["en"],
            "temperature": -0.1,
            "document_id": created_document["id"],
        }
        
        response = client.post("/api/prompts", json=prompt_data)
        assert response.status_code == 422
        
        # Temperature too high
        prompt_data["temperature"] = 1.1
        response = client.post("/api/prompts", json=prompt_data)
        assert response.status_code == 422
        
    def test_create_prompt_nonexistent_document(self, client: TestClient):
        """Test prompt creation with non-existent document ID."""
        nonexistent_id = uuid4()
        prompt_data = {
            "text": "Test prompt",
            "languages": ["en"],
            "temperature": 0.7,
            "document_id": str(nonexistent_id),
        }
        
        response = client.post("/api/prompts", json=prompt_data)
        # This should succeed at API level but will fail at database level
        # due to foreign key constraint
        assert response.status_code in [400, 500]
        
    def test_get_prompt_by_id_success(
        self,
        client: TestClient,
        created_prompt,
    ):
        """Test successful retrieval of prompt by ID."""
        response = client.get(f"/api/prompts/id/{created_prompt['id']}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == created_prompt["id"]
        assert data["text"] == created_prompt["text"]
        assert data["languages"] == created_prompt["languages"]
        assert data["temperature"] == created_prompt["temperature"]
        assert data["document_id"] == created_prompt["document_id"]
        
    def test_get_prompt_by_id_not_found(self, client: TestClient):
        """Test retrieval of non-existent prompt."""
        nonexistent_id = uuid4()
        response = client.get(f"/api/prompts/id/{nonexistent_id}")
        assert response.status_code == 404
        
        data = response.json()
        assert "not found" in data["detail"].lower()
        
    def test_get_prompt_by_id_invalid_uuid(self, client: TestClient):
        """Test retrieval with invalid UUID format."""
        response = client.get("/api/prompts/id/invalid-uuid")
        assert response.status_code == 422
        
    def test_list_prompts_success(
        self,
        client: TestClient,
        created_prompts,
    ):
        """Test successful listing of prompts."""
        response = client.get("/api/prompts")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == len(created_prompts)
        
        # Verify prompts are ordered by created_at desc
        prompt_ids = [p["id"] for p in data]
        expected_ids = [p["id"] for p in reversed(created_prompts)]  # Reversed because created_prompts are in creation order
        assert prompt_ids == expected_ids
        
    def test_list_prompts_with_pagination(
        self,
        client: TestClient,
        created_prompts,
    ):
        """Test prompts listing with pagination parameters."""
        # Test with limit
        response = client.get("/api/prompts", params={"limit": 2})
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 2
        
        # Test with skip and limit
        response = client.get("/api/prompts", params={"skip": 1, "limit": 2})
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == min(2, len(created_prompts) - 1)
        
    def test_list_prompts_empty(self, client: TestClient):
        """Test listing prompts when none exist."""
        response = client.get("/api/prompts")
        assert response.status_code == 200
        
        data = response.json()
        assert data == []
        
    def test_update_prompt_success(
        self,
        client: TestClient,
        created_prompt,
    ):
        """Test successful prompt update."""
        update_data = {
            "text": "Updated prompt text",
            "languages": ["fr", "de"],
            "temperature": 0.3,
        }
        
        response = client.put(f"/api/prompts/id/{created_prompt['id']}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == created_prompt["id"]
        assert data["text"] == update_data["text"]
        assert data["languages"] == update_data["languages"]
        assert data["temperature"] == update_data["temperature"]
        assert data["document_id"] == created_prompt["document_id"]
        assert "updated_at" in data
        
    def test_update_prompt_partial(
        self,
        client: TestClient,
        created_prompt,
    ):
        """Test partial prompt update."""
        update_data = {"text": "Only text updated"}
        
        response = client.put(f"/api/prompts/id/{created_prompt['id']}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["text"] == update_data["text"]
        # Other fields should remain unchanged
        assert data["languages"] == created_prompt["languages"]
        assert data["temperature"] == created_prompt["temperature"]
        
    def test_update_prompt_not_found(self, client: TestClient):
        """Test updating non-existent prompt."""
        nonexistent_id = uuid4()
        update_data = {"text": "Updated text"}
        
        response = client.put(f"/api/prompts/id/{nonexistent_id}", json=update_data)
        assert response.status_code == 404
        
        data = response.json()
        assert "not found" in data["detail"].lower()
        
    def test_update_prompt_invalid_temperature(
        self,
        client: TestClient,
        created_prompt,
    ):
        """Test updating prompt with invalid temperature."""
        update_data = {"temperature": 1.5}
        
        response = client.put(f"/api/prompts/id/{created_prompt['id']}", json=update_data)
        assert response.status_code == 422
        
    def test_delete_prompt_success(
        self,
        client: TestClient,
        created_prompt,
    ):
        """Test successful prompt deletion."""
        response = client.delete(f"/api/prompts/id/{created_prompt['id']}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"]
        assert created_prompt['id'] in data["message"]
        
        # Verify prompt is actually deleted
        get_response = client.get(f"/api/prompts/id/{created_prompt['id']}")
        assert get_response.status_code == 404
        
    def test_delete_prompt_not_found(self, client: TestClient):
        """Test deleting non-existent prompt."""
        nonexistent_id = uuid4()
        response = client.delete(f"/api/prompts/id/{nonexistent_id}")
        assert response.status_code == 404
        
        data = response.json()
        assert "not found" in data["detail"].lower()
        
    def test_delete_prompt_invalid_uuid(self, client: TestClient):
        """Test deleting with invalid UUID format."""
        response = client.delete("/api/prompts/id/invalid-uuid")
        assert response.status_code == 422


class TestPromptsAPIIntegration:
    """Integration tests for prompts API with related entities."""
    
    def test_create_prompt_and_verify_relations(
        self,
        client: TestClient,
        test_session: Session,
        created_project,
        created_document,
    ):
        """Test that created prompt has proper relations."""
        prompt_data = {
            "text": "Integration test prompt",
            "languages": ["en"],
            "temperature": 0.8,
            "document_id": created_document["id"],
        }
        
        response = client.post("/api/prompts", json=prompt_data)
        assert response.status_code == 200
        
        prompt_id = response.json()["id"]
        
        # Verify the prompt exists in database with relations
        prompt = test_session.query(Prompt).filter(Prompt.id == prompt_id).first()
        assert prompt is not None
        assert str(prompt.document_id) == created_document["id"]
        assert str(prompt.document.project_id) == created_project["id"]
        
    def test_create_prompt_with_custom_id_integration(
        self,
        client: TestClient,
        test_session: Session,
        created_project,
        created_document,
    ):
        """Test prompt creation with custom UUID and verify database relations."""
        custom_id = uuid4()
        prompt_data = {
            "id": str(custom_id),
            "text": "Integration test with custom ID",
            "languages": ["en"],
            "temperature": 0.5,
            "document_id": created_document["id"],
        }
        
        response = client.post("/api/prompts", json=prompt_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == str(custom_id)
        
        # Verify the prompt exists in database with proper relations
        from backend.db.models import Prompt
        prompt = test_session.query(Prompt).filter(Prompt.id == custom_id).first()
        assert prompt is not None
        assert str(prompt.document_id) == created_document["id"]
        assert str(prompt.document.project_id) == created_project["id"]
        
    def test_prompt_crud_workflow(
        self,
        client: TestClient,
        created_document,
    ):
        """Test complete CRUD workflow for prompts."""
        # Create
        create_data = {
            "text": "CRUD workflow prompt",
            "languages": ["en", "es"],
            "temperature": 0.6,
            "document_id": created_document["id"],
        }
        
        create_response = client.post("/api/prompts", json=create_data)
        assert create_response.status_code == 200
        
        prompt_id = create_response.json()["id"]
        
        # Read
        read_response = client.get(f"/api/prompts/id/{prompt_id}")
        assert read_response.status_code == 200
        assert read_response.json()["text"] == create_data["text"]
        
        # Update
        update_data = {"text": "Updated CRUD workflow prompt"}
        update_response = client.put(f"/api/prompts/id/{prompt_id}", json=update_data)
        assert update_response.status_code == 200
        assert update_response.json()["text"] == update_data["text"]
        
        # Delete
        delete_response = client.delete(f"/api/prompts/id/{prompt_id}")
        assert delete_response.status_code == 200
        
        # Verify deletion
        final_read = client.get(f"/api/prompts/id/{prompt_id}")
        assert final_read.status_code == 404


class TestPromptsAPIEdgeCases:
    """Edge case tests for prompts API."""
    
    def test_create_prompt_with_edge_case_data(
        self,
        client: TestClient,
        created_document,
    ):
        """Test prompt creation with edge case data."""
        # Empty languages list
        prompt_data = {
            "text": "Prompt with no languages",
            "languages": [],
            "temperature": 0.0,  # Minimum temperature
            "document_id": created_document["id"],
        }
        
        response = client.post("/api/prompts", json=prompt_data)
        assert response.status_code == 200
        
        # Maximum temperature
        prompt_data["temperature"] = 1.0
        prompt_data["text"] = "Max temperature prompt"
        response = client.post("/api/prompts", json=prompt_data)
        assert response.status_code == 200
        
    def test_create_prompt_with_very_long_text(
        self,
        client: TestClient,
        created_document,
    ):
        """Test prompt creation with very long text."""
        long_text = "Very long prompt text. " * 1000  # ~23,000 characters
        
        prompt_data = {
            "text": long_text,
            "languages": ["en"],
            "temperature": 0.5,
            "document_id": created_document["id"],
        }
        
        response = client.post("/api/prompts", json=prompt_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["text"] == long_text
        
    def test_create_prompt_with_many_languages(
        self,
        client: TestClient,
        created_document,
    ):
        """Test prompt creation with many languages."""
        many_languages = [
            "en", "es", "fr", "de", "it", "pt", "ru", "zh", "ja", "ko",
            "ar", "hi", "th", "vi", "pl", "nl", "sv", "da", "no", "fi",
        ]
        
        prompt_data = {
            "text": "Multi-language prompt",
            "languages": many_languages,
            "temperature": 0.7,
            "document_id": created_document["id"],
        }
        
        response = client.post("/api/prompts", json=prompt_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["languages"] == many_languages
        
    def test_update_prompt_clear_fields(
        self,
        client: TestClient,
        created_prompt,
    ):
        """Test updating prompt by clearing some fields."""
        # Try to clear languages (set to empty list)
        update_data = {"languages": []}
        
        response = client.put(f"/api/prompts/id/{created_prompt['id']}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["languages"] == []
        
    def test_concurrent_prompt_operations(
        self,
        client: TestClient,
        created_document,
    ):
        """Test concurrent operations on the same prompt."""
        # Create a prompt first
        prompt_data = {
            "text": "Concurrent test prompt",
            "languages": ["en"],
            "temperature": 0.5,
            "document_id": created_document["id"],
        }
        
        create_response = client.post("/api/prompts", json=prompt_data)
        assert create_response.status_code == 200
        
        prompt_id = create_response.json()["id"]
        
        # Simulate concurrent updates
        update_data_1 = {"text": "First concurrent update"}
        update_data_2 = {"text": "Second concurrent update"}
        
        response_1 = client.put(f"/api/prompts/id/{prompt_id}", json=update_data_1)
        response_2 = client.put(f"/api/prompts/id/{prompt_id}", json=update_data_2)
        
        # Both should succeed (last write wins)
        assert response_1.status_code == 200
        assert response_2.status_code == 200
        
        # Final state should be from the last update
        final_response = client.get(f"/api/prompts/id/{prompt_id}")
        assert final_response.status_code == 200
        final_text = final_response.json()["text"]
        assert final_text in [update_data_1["text"], update_data_2["text"]]
