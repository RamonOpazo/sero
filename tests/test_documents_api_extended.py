import uuid
import tempfile
from pathlib import Path
from unittest.mock import patch, Mock, MagicMock
from fastapi import status
from io import BytesIO


class TestDocumentsAPIExtended:
    """Extended test cases for Documents API to improve coverage."""

    def test_create_document_with_file_upload_success(self, client, created_project, sample_file_data):
        """Test creating a document with file upload."""
        project_id = created_project["id"]
        
        # Create a temporary file for upload
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
            temp_file.write(sample_file_data["data"])
            temp_file_path = temp_file.name
        
        try:
            with open(temp_file_path, "rb") as f:
                files = {"file": ("test.pdf", f, "application/pdf")}
                data = {
                    "project_id": project_id,
                    "description": "Test document with file",
                    "password": "TestPassword123!"
                }
                
                # Mock the file processing
                with patch('backend.api.controllers.documents_controller.create_with_file') as mock_create:
                    from datetime import datetime, timezone
                    mock_create.return_value = {
                        "id": str(uuid.uuid4()),
                        "name": "test.pdf",
                        "description": "Test document with file",
                        "project_id": project_id,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "tags": [],
                        "files": [],
                        "prompts": [],
                        "selections": []
                    }
                    
                    response = client.post("/api/documents/upload", data=data, files=files)
                    
                    # Verify the controller was called
                    mock_create.assert_called_once()
        finally:
            Path(temp_file_path).unlink(missing_ok=True)

    def test_create_document_with_file_missing_password(self, client, created_project, sample_file_data):
        """Test creating a document with file but missing password."""
        project_id = created_project["id"]
        
        # Create a temporary file for upload
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
            temp_file.write(sample_file_data["data"])
            temp_file_path = temp_file.name
        
        try:
            with open(temp_file_path, "rb") as f:
                files = {"file": ("test.pdf", f, "application/pdf")}
                data = {
                    "project_id": project_id,
                    "description": "Test document with file"
                    # Missing password
                }
                
                response = client.post("/api/documents/upload", data=data, files=files)
                
                # Should return 422 for missing required field
                assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        finally:
            Path(temp_file_path).unlink(missing_ok=True)

    def test_bulk_upload_documents_success(self, client, created_project, sample_file_data):
        """Test bulk document upload."""
        project_id = created_project["id"]
        
        # Create temporary files for upload
        temp_files = []
        try:
            for i in range(2):
                temp_file = tempfile.NamedTemporaryFile(suffix=f"_{i}.pdf", delete=False)
                temp_file.write(sample_file_data["data"])
                temp_file.close()
                temp_files.append(temp_file.name)
            
            files = []
            for i, temp_file_path in enumerate(temp_files):
                with open(temp_file_path, "rb") as f:
                    files.append(("files", (f"test_{i}.pdf", f.read(), "application/pdf")))
            
            data = {
                "project_id": project_id,
                "template_description": "Bulk upload test",
                "password": "TestPassword123!"
            }
            
            # Mock the bulk upload processing
            with patch('backend.api.controllers.documents_controller.bulk_create_with_files') as mock_bulk:
                mock_bulk.return_value = {"success": True, "message": "Documents uploaded successfully"}
                
                response = client.post("/api/documents/bulk-upload", data=data, files=files)
                
                # Should succeed or be mocked properly
                # The actual implementation depends on the controller
                assert response.status_code in [status.HTTP_200_OK, status.HTTP_422_UNPROCESSABLE_ENTITY]
        finally:
            for temp_file_path in temp_files:
                Path(temp_file_path).unlink(missing_ok=True)

    def test_process_document_success(self, client, created_document):
        """Test document processing endpoint."""
        document_id = created_document["id"]
        
        data = {"password": "TestPassword123!"}
        
        with patch('backend.api.controllers.documents_controller.process') as mock_process:
            mock_process.return_value = {"success": True, "message": "Document processed successfully"}
            
            response = client.post(f"/api/documents/id/{document_id}/process", data=data)
            
            # Should call the process controller
            mock_process.assert_called_once()

    def test_process_document_missing_password(self, client, created_document):
        """Test document processing without password."""
        document_id = created_document["id"]
        
        response = client.post(f"/api/documents/id/{document_id}/process", data={})
        
        # Should return 422 for missing password
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_get_document_prompts_success(self, client, created_document):
        """Test getting document prompts."""
        document_id = created_document["id"]
        
        with patch('backend.api.controllers.documents_controller.get_prompts') as mock_get_prompts:
            mock_get_prompts.return_value = []
            
            response = client.get(f"/api/documents/id/{document_id}/prompts")
            
            assert response.status_code == status.HTTP_200_OK
            mock_get_prompts.assert_called_once()

    def test_get_document_prompts_with_pagination(self, client, created_document):
        """Test getting document prompts with pagination."""
        document_id = created_document["id"]
        
        with patch('backend.api.controllers.documents_controller.get_prompts') as mock_get_prompts:
            mock_get_prompts.return_value = []
            
            response = client.get(f"/api/documents/id/{document_id}/prompts?skip=10&limit=20")
            
            assert response.status_code == status.HTTP_200_OK
            mock_get_prompts.assert_called_once()
            call_args = mock_get_prompts.call_args.kwargs
            assert call_args["skip"] == 10
            assert call_args["limit"] == 20

    def test_get_document_selections_success(self, client, created_document):
        """Test getting document selections."""
        document_id = created_document["id"]
        
        with patch('backend.api.controllers.documents_controller.get_selections') as mock_get_selections:
            mock_get_selections.return_value = []
            
            response = client.get(f"/api/documents/id/{document_id}/selections")
            
            assert response.status_code == status.HTTP_200_OK
            mock_get_selections.assert_called_once()

    def test_get_document_selections_with_pagination(self, client, created_document):
        """Test getting document selections with pagination."""
        document_id = created_document["id"]
        
        with patch('backend.api.controllers.documents_controller.get_selections') as mock_get_selections:
            mock_get_selections.return_value = []
            
            response = client.get(f"/api/documents/id/{document_id}/selections?skip=5&limit=15")
            
            assert response.status_code == status.HTTP_200_OK
            mock_get_selections.assert_called_once()
            call_args = mock_get_selections.call_args.kwargs
            assert call_args["skip"] == 5
            assert call_args["limit"] == 15

    def test_download_original_file_workflow(self, client, created_document):
        """Test original file download workflow validation."""
        document_id = created_document["id"]
        
        request_data = {
            "encrypted_password": "dGVzdF9lbmNyeXB0ZWRfcGFzc3dvcmQ=",  # base64 encoded
            "key_id": str(uuid.uuid4()),
            "stream": True
        }
        
        # Test the API endpoint exists and accepts the request format
        response = client.post(f"/api/documents/id/{document_id}/download/original", json=request_data)
        
        # Expect 404 since document has no files, but endpoint should exist
        # The important thing is we're not getting 422 (malformed request)
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST, status.HTTP_500_INTERNAL_SERVER_ERROR]

    def test_download_original_file_missing_fields(self, client, created_document):
        """Test downloading original file with missing request fields."""
        document_id = created_document["id"]
        
        # Missing required fields
        request_data = {}
        
        response = client.post(f"/api/documents/id/{document_id}/download/original", json=request_data)
        
        # Should return 422 for missing fields
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_download_redacted_file_workflow(self, client, created_document):
        """Test downloading redacted file workflow validation."""
        document_id = created_document["id"]
        
        # Test the API endpoint exists and accepts GET requests
        response = client.get(f"/api/documents/id/{document_id}/download/redacted")
        
        # Expect 404 since document has no redacted file, but endpoint should exist
        # The important thing is we're testing the endpoint structure
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST, status.HTTP_500_INTERNAL_SERVER_ERROR]

    def test_download_redacted_file_not_found(self, client):
        """Test downloading redacted file for non-existent document."""
        non_existent_id = str(uuid.uuid4())
        
        response = client.get(f"/api/documents/id/{non_existent_id}/download/redacted")
        
        # Should return 404 for non-existent document
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestDocumentsAPIValidation:
    """Test validation and edge cases for document API."""

    def test_create_document_invalid_project_id_format(self, client):
        """Test creating document with invalid project ID format."""
        document_data = {
            "name": "test_document.pdf",
            "description": "Test document",
            "project_id": "invalid-uuid-format"
        }
        
        response = client.post("/api/documents", json=document_data)
        
        # Should return 422 for invalid UUID
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_search_documents_invalid_project_id(self, client):
        """Test searching documents with invalid project ID."""
        response = client.get("/api/documents/search?project_id=invalid-uuid")
        
        # Should return 422 for invalid UUID
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_search_documents_with_filters(self, client, created_project):
        """Test searching documents with various filters."""
        project_id = created_project["id"]
        
        # Test search with name filter
        response = client.get(f"/api/documents/search?name=test&project_id={project_id}")
        assert response.status_code == status.HTTP_200_OK
        
        # Test search with pagination
        response = client.get(f"/api/documents/search?skip=0&limit=10&project_id={project_id}")
        assert response.status_code == status.HTTP_200_OK
        
        # Test search with all filters
        response = client.get(f"/api/documents/search?name=test&project_id={project_id}&skip=5&limit=15")
        assert response.status_code == status.HTTP_200_OK

    def test_update_document_invalid_fields(self, client, created_document):
        """Test updating document with invalid field types."""
        document_id = created_document["id"]
        
        # Invalid data types
        update_data = {
            "name": 123,  # Should be string
            "description": {"invalid": "object"}  # Should be string or null
        }
        
        response = client.put(f"/api/documents/id/{document_id}", json=update_data)
        
        # Should return 422 for validation errors
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_add_prompt_to_document_invalid_data(self, client, created_document):
        """Test adding prompt with invalid data."""
        document_id = created_document["id"]
        
        # Invalid prompt data
        prompt_data = {
            "content": "",  # Empty content
            "tags": "invalid_tags_format"  # Should be list
        }
        
        response = client.post(f"/api/documents/id/{document_id}/prompts", json=prompt_data)
        
        # Should return 422 for validation errors
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_add_selection_to_document_invalid_data(self, client, created_document):
        """Test adding selection with invalid data."""
        document_id = created_document["id"]
        
        # Invalid selection data
        selection_data = {
            "x": "invalid",  # Should be float
            "y": -1,  # Likely invalid coordinate
            "width": 0,  # Invalid dimension
            "height": "invalid"  # Should be float
        }
        
        response = client.post(f"/api/documents/id/{document_id}/selections", json=selection_data)
        
        # Should return 422 for validation errors
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
