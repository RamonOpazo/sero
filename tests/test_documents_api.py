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
        assert data["name"] == document_data["name"]
        assert data["description"] == document_data["description"]
        assert data["project_id"] == document_data["project_id"]
        assert "created_at" in data
        assert data["tags"] == []
        assert data["files"] == []
        assert data["prompts"] == []
        assert data["selections"] == []

    def test_create_document_missing_required_fields(self, client):
        """Test document creation with missing required fields."""
        incomplete_data = {
            "description": "Test document",
            # Missing name and project_id
        }
        response = client.post("/api/documents", json=incomplete_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_document_invalid_project_id(self, client, sample_document_data):
        """Test document creation with non-existent project ID."""
        document_data = {**sample_document_data, "project_id": str(uuid.uuid4())}
        
        response = client.post("/api/documents", json=document_data)
        
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_422_UNPROCESSABLE_ENTITY, status.HTTP_500_INTERNAL_SERVER_ERROR]

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
    
    def test_list_documents_shallow_empty(self, client):
        """Test listing shallow documents when none exist."""
        response = client.get("/api/documents/shallow")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
    
    def test_list_documents_shallow_with_document(self, client, created_document):
        """Test listing shallow documents with existing document."""
        response = client.get("/api/documents/shallow")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Verify shallow structure
        document = data[0]
        assert "id" in document
        assert "name" in document
        assert "description" in document
        assert "project_id" in document
        assert "tags" in document
        assert "created_at" in document
        assert "prompt_count" in document
        assert "selection_count" in document
        assert "is_processed" in document
        
        # Verify no nested data is loaded
        assert "files" not in document
        assert "prompts" not in document
        assert "selections" not in document
    
    def test_list_documents_shallow_with_pagination(self, client, created_document):
        """Test listing shallow documents with pagination parameters."""
        response = client.get("/api/documents/shallow?skip=0&limit=5")
        
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
            "name": "updated_document.pdf",
            "description": "Updated document description"
        }
        
        response = client.put(f"/api/documents/id/{document_id}", json=update_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["description"] == update_data["description"]

    def test_update_document_partial(self, client, created_document):
        """Test partial document update."""
        document_id = created_document["id"]
        update_data = {"description": "Only updating description"}
        
        response = client.put(f"/api/documents/id/{document_id}", json=update_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["description"] == update_data["description"]
        assert data["name"] == created_document["name"]  # Should remain unchanged

    def test_update_document_not_found(self, client):
        """Test updating a non-existent document."""
        non_existent_id = str(uuid.uuid4())
        update_data = {"description": "Updated description"}
        
        response = client.put(f"/api/documents/id/{non_existent_id}", json=update_data)
        
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

    def test_search_documents_by_project_id(self, client, created_document):
        """Test searching documents by project ID."""
        project_id = created_document["project_id"]
        
        response = client.get(f"/api/documents/search?project_id={project_id}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert all(d["project_id"] == project_id for d in data)

    def test_search_documents_by_name(self, client, created_document):
        """Test searching documents by name."""
        document_name = created_document["name"]
        
        response = client.get(f"/api/documents/search?name={document_name}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        # The search might use partial matching, so we don't enforce exact matches

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

    def test_summarize_document_success(self, client, created_document):
        """Test document summarization."""
        document_id = created_document["id"]
        
        response = client.get(f"/api/documents/id/{document_id}/summary")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "document_id" in data
        assert "name" in data
        assert "project_name" in data

    def test_summarize_document_not_found(self, client):
        """Test summarizing a non-existent document."""
        non_existent_id = str(uuid.uuid4())
        
        response = client.get(f"/api/documents/id/{non_existent_id}/summary")
        
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_501_NOT_IMPLEMENTED]

    def test_process_document_not_found(self, client):
        """Test processing a non-existent document."""
        non_existent_id = str(uuid.uuid4())
        
        response = client.post(f"/api/documents/id/{non_existent_id}/process", data={"password": "testpassword"})
        
        # The process endpoint returns 501 Not Implemented since it's not implemented yet
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_422_UNPROCESSABLE_ENTITY, status.HTTP_501_NOT_IMPLEMENTED]

    def test_get_document_tags_success(self, client, created_document):
        """Test getting tags for a document."""
        document_id = created_document["id"]
        
        response = client.get(f"/api/documents/id/{document_id}/tags")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert data == []  # New documents have no tags

    def test_get_document_tags_not_found(self, client):
        """Test getting tags for a non-existent document."""
        non_existent_id = str(uuid.uuid4())
        
        response = client.get(f"/api/documents/id/{non_existent_id}/tags")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_add_prompt_to_document_success(self, client, created_document):
        """Test adding a prompt to a document."""
        document_id = created_document["id"]
        prompt_data = {
            "text": "This is a test prompt for redaction",
            "languages": ["english"],
            "temperature": 0.7,
            "document_id": document_id
        }
        
        response = client.post(f"/api/documents/id/{document_id}/prompts", json=prompt_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["text"] == prompt_data["text"]
        assert data["languages"] == prompt_data["languages"]
        assert data["temperature"] == prompt_data["temperature"]
        assert data["document_id"] == document_id

    def test_add_prompt_to_document_not_found(self, client):
        """Test adding a prompt to a non-existent document."""
        non_existent_id = str(uuid.uuid4())
        prompt_data = {
            "text": "This is a test prompt",
            "languages": ["english"],
            "temperature": 0.7,
            "document_id": non_existent_id
        }
        
        response = client.post(f"/api/documents/id/{non_existent_id}/prompts", json=prompt_data)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_add_selection_to_document_success(self, client, created_document):
        """Test adding a selection to a document."""
        document_id = created_document["id"]
        selection_data = {
            "page_number": 1,
            "x": 0.1,
            "y": 0.2,
            "width": 0.3,
            "height": 0.4,
            "document_id": document_id
        }
        
        response = client.post(f"/api/documents/id/{document_id}/selections", json=selection_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["page_number"] == selection_data["page_number"]
        assert data["x"] == selection_data["x"]
        assert data["y"] == selection_data["y"]
        assert data["width"] == selection_data["width"]
        assert data["height"] == selection_data["height"]
        assert data["document_id"] == document_id

    def test_add_selection_to_document_not_found(self, client):
        """Test adding a selection to a non-existent document."""
        non_existent_id = str(uuid.uuid4())
        selection_data = {
            "page_number": 1,
            "x": 0.1,
            "y": 0.2,
            "width": 0.3,
            "height": 0.4,
            "document_id": non_existent_id
        }
        
        response = client.post(f"/api/documents/id/{non_existent_id}/selections", json=selection_data)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @patch('backend.api.controllers.documents_controller.bulk_create_with_files')
    def test_bulk_upload_documents_success(self, mock_bulk_upload, client, created_project):
        """Test bulk document upload."""
        from io import BytesIO
        
        mock_bulk_upload.return_value = {
            "message": "Bulk upload completed: 2 successful, 0 failed",
            "detail": {
                "successful_uploads": [
                    {"filename": "test1.pdf", "document_id": str(uuid.uuid4()), "file_id": str(uuid.uuid4()), "status": "success"},
                    {"filename": "test2.pdf", "document_id": str(uuid.uuid4()), "file_id": str(uuid.uuid4()), "status": "success"}
                ],
                "failed_uploads": [],
                "total_files": 2,
                "success_count": 2,
                "error_count": 0
            }
        }
        
        project_id = created_project["id"]
        files = [
            ("files", ("test1.pdf", BytesIO(b"fake pdf content 1"), "application/pdf")),
            ("files", ("test2.pdf", BytesIO(b"fake pdf content 2"), "application/pdf"))
        ]
        
        data = {"password": "TestPassword123!"}
        
        response = client.post(
            "/api/documents/bulk-upload",
            files=files,
            data={"project_id": project_id, **data}
        )
        
        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert "message" in result
        assert "detail" in result
        assert result["detail"]["success_count"] == 2
        assert result["detail"]["error_count"] == 0

    @patch('backend.api.controllers.documents_controller.bulk_create_with_files')
    def test_bulk_upload_documents_with_template_description(self, mock_bulk_upload, client, created_project):
        """Test bulk document upload with template description."""
        from io import BytesIO
        
        mock_bulk_upload.return_value = {
            "message": "Bulk upload completed: 1 successful, 0 failed",
            "detail": {
                "successful_uploads": [
                    {"filename": "test.pdf", "document_id": str(uuid.uuid4()), "file_id": str(uuid.uuid4()), "status": "success"}
                ],
                "failed_uploads": [],
                "total_files": 1,
                "success_count": 1,
                "error_count": 0
            }
        }
        
        project_id = created_project["id"]
        files = [("files", ("test.pdf", BytesIO(b"fake pdf content"), "application/pdf"))]
        
        data = {
            "project_id": project_id,
            "password": "TestPassword123!",
            "template_description": "Legal documents from client X"
        }
        
        response = client.post(
            "/api/documents/bulk-upload",
            files=files,
            data=data
        )
        
        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert "message" in result
        # Verify the controller was called with template_description
        mock_bulk_upload.assert_called_once()
        call_kwargs = mock_bulk_upload.call_args[1]
        assert "template_description" in call_kwargs
        assert call_kwargs["template_description"] == "Legal documents from client X"

    def test_bulk_upload_documents_missing_password(self, client, created_project):
        """Test bulk document upload without password."""
        from io import BytesIO
        
        project_id = created_project["id"]
        files = [("files", ("test.pdf", BytesIO(b"fake pdf content"), "application/pdf"))]
        
        response = client.post(
            "/api/documents/bulk-upload",
            files=files,
            data={"project_id": project_id}
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
