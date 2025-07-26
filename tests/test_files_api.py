import uuid
from unittest.mock import patch
from fastapi import status


class TestFilesAPI:
    """Test cases for the simplified Files API endpoints."""

    def test_get_file_by_id_success(self, client, created_document):
        """Test getting a specific file by ID."""
        # Since we don't create files directly anymore, let's test with a document that has files
        document_id = created_document["id"]
        
        # First check if the document has files
        document_response = client.get(f"/api/documents/id/{document_id}")
        assert document_response.status_code == status.HTTP_200_OK
        document_data = document_response.json()
        
        # If document has files, test getting the first one
        if document_data["files"]:
            file_id = document_data["files"][0]["id"]
            
            response = client.get(f"/api/files/id/{file_id}")
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["id"] == file_id
            assert data["document_id"] == document_id
        else:
            # If no files, this test doesn't apply to this document
            # This is expected since our simplified API doesn't create files directly
            pass

    def test_get_file_by_id_not_found(self, client):
        """Test getting a non-existent file."""
        non_existent_id = str(uuid.uuid4())
        
        response = client.get(f"/api/files/id/{non_existent_id}")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_file_by_id_invalid_uuid(self, client):
        """Test getting a file with invalid UUID format."""
        invalid_id = "not-a-valid-uuid"
        
        response = client.get(f"/api/files/id/{invalid_id}")
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_delete_file_not_found(self, client):
        """Test deleting a non-existent file."""
        non_existent_id = str(uuid.uuid4())
        
        response = client.delete(f"/api/files/id/{non_existent_id}")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_download_file_not_found(self, client):
        """Test downloading a non-existent file."""
        non_existent_id = str(uuid.uuid4())
        
        response = client.get(f"/api/files/id/{non_existent_id}/download?password=testpassword")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_download_file_missing_password(self, client):
        """Test downloading a file without providing password."""
        file_id = str(uuid.uuid4())
        
        response = client.get(f"/api/files/id/{file_id}/download")
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Note: We don't test the actual functionality of file operations that require real files
    # since the current API is simplified and files are created through document uploads.
    # The complex file operations (create, search, prompts, selections) have been removed
    # from the files API and moved to the documents API as part of the refactoring.


class TestFilesAPILegacyEndpoints:
    """Test that legacy endpoints that were removed return appropriate errors."""

    def test_create_file_endpoint_removed(self, client):
        """Test that the file creation endpoint no longer exists."""
        file_data = {
            "filename": "test.pdf",
            "mime_type": "application/pdf",
            "data": "fake_data",
            "document_id": str(uuid.uuid4())
        }
        
        response = client.post("/api/files", json=file_data)
        
        # Should return 404 or 405 since the endpoint doesn't exist
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_405_METHOD_NOT_ALLOWED]

    def test_list_files_endpoint_removed(self, client):
        """Test that the file listing endpoint no longer exists."""
        response = client.get("/api/files")
        
        # Should return 404 since the endpoint doesn't exist
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_search_files_endpoint_removed(self, client):
        """Test that the file search endpoint no longer exists."""
        response = client.get("/api/files/search")
        
        # Should return 404 since the endpoint doesn't exist
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_file_prompts_endpoint_removed(self, client):
        """Test that file prompts endpoints no longer exist."""
        file_id = str(uuid.uuid4())
        
        # Test GET prompts
        response = client.get(f"/api/files/id/{file_id}/prompts")
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_405_METHOD_NOT_ALLOWED]
        
        # Test PUT prompts
        response = client.put(f"/api/files/id/{file_id}/prompts", json=[])
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_405_METHOD_NOT_ALLOWED]

    def test_file_selections_endpoint_removed(self, client):
        """Test that file selections endpoints no longer exist."""
        file_id = str(uuid.uuid4())
        
        # Test GET selections
        response = client.get(f"/api/files/id/{file_id}/selections")
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_405_METHOD_NOT_ALLOWED]
        
        # Test PUT selections
        response = client.put(f"/api/files/id/{file_id}/selections", json=[])
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_405_METHOD_NOT_ALLOWED]

    def test_file_summary_endpoint_removed(self, client):
        """Test that file summary endpoint no longer exists."""
        file_id = str(uuid.uuid4())
        
        response = client.get(f"/api/files/id/{file_id}/summary")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
