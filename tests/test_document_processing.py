"""
Tests for document processing with PDF redaction based on selections.
"""

import pytest
import pymupdf
from uuid import uuid4
from unittest.mock import patch, MagicMock

from backend.api.controllers.documents_controller import process
from backend.api.enums import DocumentStatus
from backend.api.schemas.selections_schema import Selection
from backend.core.redactor import PDFRedactionError


class TestDocumentProcessing:
    """Test cases for document processing functionality."""

    @pytest.fixture
    def sample_pdf_with_text(self):
        """Create a PDF with text at specific positions for testing selections."""
        doc = pymupdf.open()
        page = doc.new_page()
        
        # Add text at different positions (using absolute coordinates)
        # Top area (should be redacted by top selection)
        page.insert_text((100, 100), "CONFIDENTIAL HEADER TEXT", fontsize=14)
        
        # Middle area (should remain)
        page.insert_text((100, 300), "This is normal body text that should remain", fontsize=12)
        
        # Bottom area (should be redacted by bottom selection)
        page.insert_text((100, 700), "SENSITIVE FOOTER INFORMATION", fontsize=12)
        
        pdf_data = doc.write()
        doc.close()
        return pdf_data

    @pytest.fixture
    def mock_document_with_file_and_selections(self, sample_pdf_with_text):
        """Create a mock document with original file and selections."""
        # Create mock selections that cover top and bottom areas
        selection1 = MagicMock()
        selection1.page_number = 1
        selection1.x = 0.1  # 10% from left
        selection1.y = 0.05  # 5% from top
        selection1.width = 0.8  # 80% width
        selection1.height = 0.15  # 15% height (covers header area)
        
        selection2 = MagicMock()
        selection2.page_number = 1
        selection2.x = 0.1  # 10% from left
        selection2.y = 0.8   # 80% from top
        selection2.width = 0.8  # 80% width
        selection2.height = 0.15  # 15% height (covers footer area)
        
        # Create mock original file
        mock_original_file = MagicMock()
        mock_original_file.id = uuid4()
        mock_original_file.data = sample_pdf_with_text
        mock_original_file.filename = "test_document.pdf"
        mock_original_file.mime_type = "application/pdf"
        mock_original_file.salt = b"test_salt_12345678"
        mock_original_file.selections = [selection1, selection2]
        
        # Create mock document
        mock_document = MagicMock()
        mock_document.id = uuid4()
        mock_document.original_file = mock_original_file
        mock_document.obfuscated_file = None  # No existing obfuscated file
        
        return mock_document

    def test_process_document_success(self, mock_document_with_file_and_selections):
        """Test successful document processing with redactions."""
        document_id = mock_document_with_file_and_selections.id
        
        with patch('backend.api.controllers.documents_controller.documents_crud') as mock_documents_crud, \
             patch('backend.api.controllers.documents_controller.files_crud') as mock_files_crud, \
             patch('backend.api.controllers.documents_controller.update_status') as mock_update_status, \
             patch('backend.api.controllers.documents_controller.security_manager') as mock_security:
            
            # Setup mocks
            mock_documents_crud.read_with_backrefs.return_value = mock_document_with_file_and_selections
            mock_security.generate_file_hash.return_value = "mock_hash_123456"
            
            mock_created_file = MagicMock()
            mock_created_file.id = uuid4()
            mock_files_crud.create.return_value = mock_created_file
            
            # Create mock database session
            mock_db = MagicMock()
            
            # Execute the process function
            result = process(db=mock_db, document_id=document_id)
            
            # Verify the result
            assert result.message == "Document processed successfully"
            assert "document_id" in result.detail
            assert "obfuscated_file_id" in result.detail
            assert "redaction_uuid" in result.detail
            assert result.detail["selections_processed"] == 2
            assert result.detail["status"] == "processed"
            
            # Verify that files_crud.create was called to create obfuscated file
            mock_files_crud.create.assert_called_once()
            create_call_args = mock_files_crud.create.call_args[1]["data"]
            assert create_call_args.is_original_file is False
            assert create_call_args.mime_type == "application/pdf"
            assert "redacted" in create_call_args.filename
            
            # Verify document status was updated
            mock_update_status.assert_called_once_with(
                db=mock_db, 
                document_id=document_id, 
                status=DocumentStatus.PROCESSED
            )

    def test_process_document_not_found(self):
        """Test processing when document doesn't exist."""
        document_id = uuid4()
        
        with patch('backend.api.controllers.documents_controller.documents_crud') as mock_documents_crud:
            mock_documents_crud.read_with_backrefs.return_value = None
            mock_db = MagicMock()
            
            with pytest.raises(Exception) as exc_info:
                process(db=mock_db, document_id=document_id)
            
            assert "not found" in str(exc_info.value)

    def test_process_document_no_original_file(self):
        """Test processing when document has no original file."""
        document_id = uuid4()
        
        mock_document = MagicMock()
        mock_document.id = document_id
        mock_document.original_file = None
        
        with patch('backend.api.controllers.documents_controller.documents_crud') as mock_documents_crud:
            mock_documents_crud.read_with_backrefs.return_value = mock_document
            mock_db = MagicMock()
            
            with pytest.raises(Exception) as exc_info:
                process(db=mock_db, document_id=document_id)
            
            assert "no original file" in str(exc_info.value)

    def test_process_document_no_selections(self, sample_pdf_with_text):
        """Test processing when document has no selections."""
        document_id = uuid4()
        
        # Create mock document with file but no selections
        mock_original_file = MagicMock()
        mock_original_file.data = sample_pdf_with_text
        mock_original_file.selections = []  # No selections
        
        mock_document = MagicMock()
        mock_document.id = document_id
        mock_document.original_file = mock_original_file
        mock_document.obfuscated_file = None
        
        with patch('backend.api.controllers.documents_controller.documents_crud') as mock_documents_crud:
            mock_documents_crud.read_with_backrefs.return_value = mock_document
            mock_db = MagicMock()
            
            with pytest.raises(Exception) as exc_info:
                process(db=mock_db, document_id=document_id)
            
            assert "no selections" in str(exc_info.value)

    def test_process_document_replaces_existing_obfuscated(self, mock_document_with_file_and_selections):
        """Test that processing replaces existing obfuscated file."""
        document_id = mock_document_with_file_and_selections.id
        
        # Add existing obfuscated file to mock document
        existing_obfuscated = MagicMock()
        existing_obfuscated.id = uuid4()
        mock_document_with_file_and_selections.obfuscated_file = existing_obfuscated
        
        with patch('backend.api.controllers.documents_controller.documents_crud') as mock_documents_crud, \
             patch('backend.api.controllers.documents_controller.files_crud') as mock_files_crud, \
             patch('backend.api.controllers.documents_controller.update_status') as mock_update_status, \
             patch('backend.api.controllers.documents_controller.security_manager') as mock_security:
            
            # Setup mocks
            mock_documents_crud.read_with_backrefs.return_value = mock_document_with_file_and_selections
            mock_security.generate_file_hash.return_value = "mock_hash_123456"
            
            mock_created_file = MagicMock()
            mock_created_file.id = uuid4()
            mock_files_crud.create.return_value = mock_created_file
            
            mock_db = MagicMock()
            
            # Execute the process function
            result = process(db=mock_db, document_id=document_id)
            
            # Verify that existing obfuscated file was deleted
            mock_files_crud.delete.assert_called_once_with(db=mock_db, id=existing_obfuscated.id)
            
            # Verify new file was created
            mock_files_crud.create.assert_called_once()
            
            # Verify successful result
            assert result.message == "Document processed successfully"

    def test_selection_to_pdf_rect_conversion(self):
        """Test conversion of normalized selection coordinates to PDF coordinates."""
        from backend.api.controllers.documents_controller import _convert_selection_to_pdf_rect
        
        # Create mock selection with normalized coordinates (0-1)
        selection = MagicMock()
        selection.x = 0.1      # 10% from left
        selection.y = 0.2      # 20% from top  
        selection.width = 0.5  # 50% width
        selection.height = 0.3 # 30% height
        
        # Create mock page rectangle (typical A4 size in points)
        page_rect = pymupdf.Rect(0, 0, 595, 842)  # A4 size in points
        
        result_rect = _convert_selection_to_pdf_rect(selection, page_rect)
        
        # Verify coordinate conversion
        expected_x0 = 0 + (0.1 * 595)    # 59.5
        expected_y0 = 0 + (0.2 * 842)    # 168.4
        expected_x1 = expected_x0 + (0.5 * 595)  # 59.5 + 297.5 = 357
        expected_y1 = expected_y0 + (0.3 * 842)  # 168.4 + 252.6 = 421
        
        assert abs(result_rect.x0 - expected_x0) < 0.1
        assert abs(result_rect.y0 - expected_y0) < 0.1
        assert abs(result_rect.x1 - expected_x1) < 0.1
        assert abs(result_rect.y1 - expected_y1) < 0.1

    def test_generate_obfuscated_filename(self):
        """Test generation of obfuscated file names."""
        from backend.api.controllers.documents_controller import _generate_obfuscated_filename
        
        redaction_uuid = uuid4()
        uuid_prefix = str(redaction_uuid)[:8]
        
        # Test with original filename
        result1 = _generate_obfuscated_filename("document.pdf", redaction_uuid)
        assert result1 == f"document_redacted_{uuid_prefix}.pdf"
        
        # Test with filename without extension
        result2 = _generate_obfuscated_filename("document", redaction_uuid)
        assert result2 == f"document_redacted_{uuid_prefix}.pdf"
        
        # Test with None filename
        result3 = _generate_obfuscated_filename(None, redaction_uuid)
        assert result3 == f"redacted_{uuid_prefix}.pdf"

    @pytest.mark.integration
    def test_full_document_processing_workflow(self, sample_pdf_with_text):
        """Integration test for complete document processing workflow."""
        # This test would require actual database setup
        # For now, we'll just verify the redaction logic works with real PDF
        
        from backend.api.controllers.documents_controller import _apply_selection_based_redactions
        
        # Create mock selections
        selection1 = MagicMock()
        selection1.page_number = 1
        selection1.x = 0.1
        selection1.y = 0.05
        selection1.width = 0.8
        selection1.height = 0.15
        
        selections = [selection1]
        
        # Apply redactions
        redacted_data, extracted_text, redaction_uuid = _apply_selection_based_redactions(
            sample_pdf_with_text, selections, "test.pdf"
        )
        
        # Verify results
        assert isinstance(redacted_data, bytes)
        assert len(redacted_data) > 0
        assert isinstance(extracted_text, str)
        assert len(extracted_text) > 0
        assert "CONFIDENTIAL" in extracted_text  # Should extract the header text
        
        # Verify the redacted PDF is valid and contains redaction marker
        redacted_doc = pymupdf.open("pdf", redacted_data)
        page_text = redacted_doc.load_page(0).get_text()
        assert str(redaction_uuid) in page_text  # Redaction marker should be present
        redacted_doc.close()
