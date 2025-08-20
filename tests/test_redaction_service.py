import pytest
from unittest.mock import Mock, patch
from uuid import uuid4

from backend.services.redaction_service import DocumentRedactionService, create_redaction_service
from backend.db.models import Document, File
from backend.api.enums import FileType


class TestRedactionService:
    
    def test_create_redaction_service(self):
        service = create_redaction_service()
        assert isinstance(service, DocumentRedactionService)
    
    def test_service_initialization(self):
        service = DocumentRedactionService()
        assert service.redactor is not None
    
    @patch('backend.services.redaction_service.selections_crud')
    @patch('backend.services.redaction_service.files_crud')
    def test_process_document_basic_flow(self, mock_files_crud, mock_selections_crud):
        service = DocumentRedactionService()
        
        # Mock database session
        mock_db = Mock()
        document_id = uuid4()
        
        # Mock document with files
        mock_file = Mock()
        mock_file.file_type = FileType.ORIGINAL
        mock_file.encrypted_data = b"sample pdf data"
        mock_file.filename = "test.pdf"
        mock_file.mime_type = "application/pdf"
        mock_file.salt = b"test_salt"
        
        mock_document = Mock()
        mock_document.id = document_id
        mock_document.files = [mock_file]
        
        # Mock selections
        mock_selection = Mock()
        mock_selection.x = 0.1
        mock_selection.y = 0.2
        mock_selection.width = 0.3
        mock_selection.height = 0.4
        mock_selection.page_number = 1
        
        # Setup mocks
        mock_db.query().filter().first.return_value = mock_document
        mock_selections_crud.read_list_by_document.return_value = [mock_selection]
        mock_files_crud.create.return_value = Mock()
        
        # Mock the redactor
        service.redactor.redact_document = Mock(return_value=b"redacted pdf data")
        
        # Execute
        result = service.process_document(mock_db, document_id)
        
        # Verify
        assert result is not None
        service.redactor.redact_document.assert_called_once()
        mock_files_crud.create.assert_called_once()
    
    def test_get_document_selections_conversion(self):
        service = DocumentRedactionService()
        mock_db = Mock()
        document_id = uuid4()
        
        mock_selection = Mock()
        mock_selection.x = 0.1
        mock_selection.y = 0.2
        mock_selection.width = 0.3
        mock_selection.height = 0.4
        mock_selection.page_number = 1
        
        with patch('backend.services.redaction_service.selections_crud') as mock_crud:
            mock_crud.read_list_by_document.return_value = [mock_selection]
            
            selections = service._get_document_selections(mock_db, document_id)
            
            assert len(selections) == 1
            assert selections[0]['x'] == 0.1
            assert selections[0]['y'] == 0.2
            assert selections[0]['width'] == 0.3
            assert selections[0]['height'] == 0.4
            assert selections[0]['page_number'] == 1
    
    def test_get_original_file_success(self):
        service = DocumentRedactionService()
        
        original_file = Mock()
        original_file.file_type = FileType.ORIGINAL
        
        other_file = Mock()
        other_file.file_type = FileType.REDACTED
        
        document = Mock()
        document.files = [other_file, original_file]
        
        result = service._get_original_file(document)
        assert result == original_file
    
    def test_get_original_file_not_found(self):
        service = DocumentRedactionService()
        
        other_file = Mock()
        other_file.file_type = FileType.REDACTED
        
        document = Mock()
        document.files = [other_file]
        
        with pytest.raises(ValueError, match="No original file found"):
            service._get_original_file(document)
    
    def test_calculate_file_hash(self):
        service = DocumentRedactionService()
        test_data = b"test data"
        
        hash_result = service._calculate_file_hash(test_data)
        
        assert isinstance(hash_result, str)
        assert len(hash_result) == 64  # SHA256 hex digest length
