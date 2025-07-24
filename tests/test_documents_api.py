import uuid
from unittest.mock import patch
from fastapi import status


class TestDocumentsAPI:
    """Test cases for the Documents API endpoints."""

    def test_create_document_success(self, client, created_project, sample_document_data, mock_security_manager):
        """Test successful document creation."""
        document_data = {**sample_document_data, "project_id": created_project["id"]}
        
        response = client.post("/api/documents", json=document_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert "id" in data
        assert data["description"] == document_data["description"]
        assert data["status"] == document_data["status"]
        assert data["project_id"] == document_data["project_id"]
        assert "created_at" in data
        assert data["original_file"] is None
        assert data["obfuscated_file"] is None

    def test_create_document_missing_required_fields(self, client):
        """Test document creation with missing required fields."""
        incomplete_data = {
            "description": "Test document",
            # Missing project_id and status
        }
        response = client.post("/api/documents", json=incomplete_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_document_invalid_project_id(self, client, sample_document_data):
        """Test document creation with non-existent project ID."""
        document_data = {**sample_document_data, "project_id": str(uuid.uuid4())}
        
        response = client.post("/api/documents", json=document_data)
        
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_422_UNPROCESSABLE_ENTITY, status.HTTP_500_INTERNAL_SERVER_ERROR]

    def test_create_document_invalid_status(self, client, created_project):
        """Test document creation with invalid status."""
        document_data = {
            "project_id": created_project["id"],
            "description": "Test document",
            "status": "invalid_status"
        }
        
        response = client.post("/api/documents", json=document_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_list_documents_empty(self, client):
        """Test listing documents when none exist."""
        response = client.get("/api/documents")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_list_documents_with_pagination(self, client, created_document):
        """Test listing documents with pagination parameters."""
        response = client.get("/api/documents?skip=0&limit=10")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_document_by_id_success(self, client, created_document):
        """Test getting a specific document by ID."""
        document_id = created_document["id"]
        
        response = client.get(f"/api/documents/id/{document_id}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == document_id
        assert data["description"] == created_document["description"]

    def test_get_document_by_id_not_found(self, client):
        """Test getting a non-existent document."""
        non_existent_id = str(uuid.uuid4())
        
        response = client.get(f"/api/documents/id/{non_existent_id}")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_document_by_id_invalid_uuid(self, client):
        """Test getting a document with invalid UUID format."""
        invalid_id = "not-a-valid-uuid"
        
        response = client.get(f"/api/documents/id/{invalid_id}")
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_update_document_success(self, client, created_document):
        """Test successful document update."""
        document_id = created_document["id"]
        update_data = {
            "description": "Updated document description",
            "status": "processed"
        }
        
        response = client.put(f"/api/documents/id/{document_id}", json=update_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["description"] == update_data["description"]
        assert data["status"] == update_data["status"]

    def test_update_document_partial(self, client, created_document):
        """Test partial document update."""
        document_id = created_document["id"]
        update_data = {"description": "Only updating description"}
        
        response = client.put(f"/api/documents/id/{document_id}", json=update_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["description"] == update_data["description"]
        assert data["status"] == created_document["status"]  # Should remain unchanged

    def test_update_document_not_found(self, client):
        """Test updating a non-existent document."""
        non_existent_id = str(uuid.uuid4())
        update_data = {"description": "Updated description"}
        
        response = client.put(f"/api/documents/id/{non_existent_id}", json=update_data)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_document_status_success(self, client, created_document):
        """Test successful document status update."""
        document_id = created_document["id"]
        new_status = "processed"
        
        response = client.patch(f"/api/documents/id/{document_id}/status?status={new_status}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == new_status

    def test_update_document_status_invalid_status(self, client, created_document):
        """Test document status update with invalid status."""
        document_id = created_document["id"]
        invalid_status = "invalid_status"
        
        response = client.patch(f"/api/documents/id/{document_id}/status?status={invalid_status}")
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_update_document_status_not_found(self, client):
        """Test updating status of a non-existent document."""
        non_existent_id = str(uuid.uuid4())
        
        response = client.patch(f"/api/documents/id/{non_existent_id}/status?status=processed")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_document_success(self, client, created_document):
        """Test successful document deletion."""
        document_id = created_document["id"]
        
        response = client.delete(f"/api/documents/id/{document_id}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "message" in data
        
        # Verify document is deleted
        get_response = client.get(f"/api/documents/id/{document_id}")
        assert get_response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_document_not_found(self, client):
        """Test deleting a non-existent document."""
        non_existent_id = str(uuid.uuid4())
        
        response = client.delete(f"/api/documents/id/{non_existent_id}")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_search_documents_by_status(self, client, created_document):
        """Test searching documents by status."""
        document_status = created_document["status"]
        
        response = client.get(f"/api/documents/search?status={document_status}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert all(d["status"] == document_status for d in data)

    def test_search_documents_by_project_id(self, client, created_document):
        """Test searching documents by project ID."""
        project_id = created_document["project_id"]
        
        response = client.get(f"/api/documents/search?project_id={project_id}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert all(d["project_id"] == project_id for d in data)

    def test_search_documents_multiple_filters(self, client, created_document):
        """Test searching documents with multiple filters."""
        project_id = created_document["project_id"]
        document_status = created_document["status"]
        
        response = client.get(f"/api/documents/search?project_id={project_id}&status={document_status}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert all(d["project_id"] == project_id and d["status"] == document_status for d in data)

    def test_search_documents_no_results(self, client):
        """Test searching documents with no matching results."""
        non_existent_project_id = str(uuid.uuid4())
        
        response = client.get(f"/api/documents/search?project_id={non_existent_project_id}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_search_documents_with_pagination(self, client, created_document):
        """Test searching documents with pagination."""
        project_id = created_document["project_id"]
        
        response = client.get(f"/api/documents/search?project_id={project_id}&skip=0&limit=5")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    @patch('backend.api.controllers.documents_controller.summarize')
    def test_summarize_document_success(self, mock_summarize, client, created_document):
        """Test document summarization."""
        mock_summarize.return_value = {"message": "Document summarized successfully"}
        document_id = created_document["id"]
        
        response = client.get(f"/api/documents/id/{document_id}/summary")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "message" in data

    def test_summarize_document_not_found(self, client):
        """Test summarizing a non-existent document."""
        non_existent_id = str(uuid.uuid4())
        
        response = client.get(f"/api/documents/id/{non_existent_id}/summary")
        
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_501_NOT_IMPLEMENTED]

    @patch('backend.api.controllers.documents_controller.process')
    def test_process_document_success(self, mock_process, client, created_document):
        """Test document processing."""
        mock_process.return_value = {"message": "Document processed successfully"}
        document_id = created_document["id"]
        
        response = client.post(f"/api/documents/id/{document_id}/process")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "message" in data

    def test_process_document_not_found(self, client):
        """Test processing a non-existent document."""
        non_existent_id = str(uuid.uuid4())
        
        response = client.post(f"/api/documents/id/{non_existent_id}/process")
        
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_501_NOT_IMPLEMENTED]

    def test_valid_document_statuses(self, client, created_project):
        """Test that all valid document statuses are accepted."""
        valid_statuses = ["pending", "processed", "failed"]
        
        for status_value in valid_statuses:
            document_data = {
                "project_id": created_project["id"],
                "description": f"Test document with {status_value} status",
                "status": status_value
            }
            
            response = client.post("/api/documents", json=document_data)
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["status"] == status_value
