"""
Tests for PDF Redaction functionality.
"""

import pytest
import pymupdf
from unittest.mock import patch, MagicMock
from uuid import UUID

from backend.core.redactor import (
    PDFRedactor,
    RedactionConfig,
    RedactionResult,
    CropBorder,
    CropGap,
    PDFRedactionError,
    create_pdf_redactor
)


class TestPDFRedactor:
    """Test cases for PDF redaction functionality."""

    @pytest.fixture
    def sample_pdf_data(self):
        """Create a simple PDF for testing."""
        # Create a simple PDF document with text
        doc = pymupdf.open()
        page = doc.new_page()
        
        # Add text at different positions
        page.insert_text((50, 50), "Header Text - Should be redacted", fontsize=12)
        page.insert_text((50, 200), "Body Text - Should remain", fontsize=12)
        page.insert_text((50, 750), "Footer Text - Should be redacted", fontsize=12)
        
        pdf_data = doc.write()
        doc.close()
        return pdf_data

    @pytest.fixture
    def basic_config(self):
        """Basic redaction configuration for testing."""
        return RedactionConfig(
            crop_border=CropBorder.TOP,
            crop_gap=100.0,
            crop_pages=None
        )

    def test_redaction_config_creation(self):
        """Test RedactionConfig creation with different parameters."""
        config = RedactionConfig(
            crop_border=CropBorder.TOP,
            crop_gap=150.0,
            crop_pages="1-3,5"
        )
        
        assert config.crop_border == CropBorder.TOP
        assert config.crop_gap == 150.0
        assert config.crop_pages == "1-3,5"
        assert config.marker_text == "SERO REDACTED"

    def test_pdf_redactor_initialization(self, basic_config):
        """Test PDFRedactor initialization."""
        redactor = PDFRedactor(basic_config)
        
        assert redactor.config == basic_config
        assert redactor._crop_ranges is None

    def test_pdf_redactor_with_page_ranges(self):
        """Test PDFRedactor initialization with page ranges."""
        config = RedactionConfig(
            crop_border=CropBorder.TOP,
            crop_gap=100.0,
            crop_pages="1-3,5,7-9"
        )
        
        redactor = PDFRedactor(config)
        expected_pages = {1, 2, 3, 5, 7, 8, 9}
        
        assert redactor._crop_ranges == expected_pages

    def test_parse_page_ranges_valid(self, basic_config):
        """Test parsing valid page range strings."""
        redactor = PDFRedactor(basic_config)
        
        # Test single page
        pages = redactor._parse_page_ranges("5")
        assert pages == {5}
        
        # Test range
        pages = redactor._parse_page_ranges("1-3")
        assert pages == {1, 2, 3}
        
        # Test mixed
        pages = redactor._parse_page_ranges("1,3-5,7")
        assert pages == {1, 3, 4, 5, 7}

    def test_parse_page_ranges_invalid(self, basic_config):
        """Test parsing invalid page range strings."""
        redactor = PDFRedactor(basic_config)
        
        with pytest.raises(PDFRedactionError):
            redactor._parse_page_ranges("invalid")
        
        with pytest.raises(PDFRedactionError):
            redactor._parse_page_ranges("5-3")  # Invalid range

    def test_validate_pdf_data_valid(self, sample_pdf_data):
        """Test PDF validation with valid data."""
        assert PDFRedactor.validate_pdf_data(sample_pdf_data) is True

    def test_validate_pdf_data_invalid(self):
        """Test PDF validation with invalid data."""
        invalid_data = b"This is not a PDF"
        assert PDFRedactor.validate_pdf_data(invalid_data) is False

    def test_redact_pdf_basic(self, sample_pdf_data, basic_config):
        """Test basic PDF redaction functionality."""
        redactor = PDFRedactor(basic_config)
        result = redactor.redact_pdf(sample_pdf_data, "test.pdf")
        
        assert isinstance(result, RedactionResult)
        assert isinstance(result.redacted_pdf_data, bytes)
        assert isinstance(result.extracted_text, str)
        assert isinstance(result.redaction_uuid, UUID)
        assert result.page_count == 1
        assert result.redacted_areas_count >= 0

    def test_redact_pdf_with_page_ranges(self, sample_pdf_data):
        """Test PDF redaction with specific page ranges."""
        config = RedactionConfig(
            crop_border=CropBorder.TOP,
            crop_gap=100.0,
            crop_pages="1"  # Only redact page 1
        )
        
        redactor = PDFRedactor(config)
        result = redactor.redact_pdf(sample_pdf_data)
        
        assert result.page_count == 1
        assert isinstance(result.redaction_uuid, UUID)

    def test_redact_pdf_encrypted_error(self, basic_config):
        """Test error handling for encrypted PDFs."""
        # Create an encrypted PDF
        doc = pymupdf.open()
        page = doc.new_page()
        page.insert_text((50, 50), "Test content", fontsize=12)
        
        # Note: Creating truly encrypted PDF is complex, so we'll mock it
        redactor = PDFRedactor(basic_config)
        
        with patch('pymupdf.open') as mock_open:
            mock_doc = MagicMock()
            mock_doc.is_encrypted = True
            mock_open.return_value = mock_doc
            
            with pytest.raises(PDFRedactionError, match="PDF is encrypted"):
                redactor.redact_pdf(b"fake_pdf_data")

    def test_redact_pdf_empty_error(self, basic_config):
        """Test error handling for empty PDFs."""
        redactor = PDFRedactor(basic_config)
        
        with patch('pymupdf.open') as mock_open:
            mock_doc = MagicMock()
            mock_doc.is_encrypted = False
            mock_doc.page_count = 0
            mock_open.return_value = mock_doc
            
            with pytest.raises(PDFRedactionError, match="PDF contains no pages"):
                redactor.redact_pdf(b"fake_pdf_data")

    def test_should_redact_page_all_pages(self, basic_config):
        """Test page redaction logic when all pages should be redacted."""
        redactor = PDFRedactor(basic_config)
        
        # When no specific pages are configured, all should be redacted
        assert redactor._should_redact_page(1) is True
        assert redactor._should_redact_page(5) is True

    def test_should_redact_page_specific_pages(self):
        """Test page redaction logic with specific page ranges."""
        config = RedactionConfig(
            crop_border=CropBorder.TOP,
            crop_gap=100.0,
            crop_pages="1,3-5"
        )
        
        redactor = PDFRedactor(config)
        
        assert redactor._should_redact_page(1) is True
        assert redactor._should_redact_page(2) is False
        assert redactor._should_redact_page(3) is True
        assert redactor._should_redact_page(4) is True
        assert redactor._should_redact_page(5) is True
        assert redactor._should_redact_page(6) is False

    def test_is_rect_in_crop_area_top(self):
        """Test rectangle crop area detection for top border."""
        config = RedactionConfig(
            crop_border=CropBorder.TOP,
            crop_gap=100.0
        )
        
        redactor = PDFRedactor(config)
        
        # Create mock rectangles
        top_rect = MagicMock()
        top_rect.y0 = 50  # Should be redacted (< 100)
        
        middle_rect = MagicMock()
        middle_rect.y0 = 150  # Should not be redacted (> 100)
        
        assert redactor._is_rect_in_crop_area(top_rect) is True
        assert redactor._is_rect_in_crop_area(middle_rect) is False

    def test_is_rect_in_crop_area_bottom(self):
        """Test rectangle crop area detection for bottom border."""
        config = RedactionConfig(
            crop_border=CropBorder.BOTTOM,
            crop_gap=700.0  # Assuming page height around 800
        )
        
        redactor = PDFRedactor(config)
        
        # Create mock rectangles
        bottom_rect = MagicMock()
        bottom_rect.y1 = 750  # Should be redacted (>= 700)
        
        middle_rect = MagicMock()
        middle_rect.y1 = 650  # Should not be redacted (< 700)
        
        assert redactor._is_rect_in_crop_area(bottom_rect) is True
        assert redactor._is_rect_in_crop_area(middle_rect) is False

    def test_create_default_config(self):
        """Test default configuration creation."""
        config = PDFRedactor.create_default_config()
        
        assert config.crop_border == CropBorder.TOP
        assert config.crop_gap == 100.0
        assert config.crop_pages is None

    def test_create_default_config_with_params(self):
        """Test default configuration creation with custom parameters."""
        config = PDFRedactor.create_default_config(
            crop_border=CropBorder.BOTTOM,
            crop_gap=200.0,
            crop_pages="1-5"
        )
        
        assert config.crop_border == CropBorder.BOTTOM
        assert config.crop_gap == 200.0
        assert config.crop_pages == "1-5"

    def test_create_pdf_redactor_factory(self):
        """Test factory function for creating PDF redactor."""
        redactor = create_pdf_redactor(
            crop_border="top",
            crop_gap=150.0,
            crop_pages="1-3"
        )
        
        assert isinstance(redactor, PDFRedactor)
        assert redactor.config.crop_border == CropBorder.TOP
        assert redactor.config.crop_gap == 150.0
        assert redactor.config.crop_pages == "1-3"

    def test_create_pdf_redactor_invalid_border(self):
        """Test factory function with invalid border parameter."""
        with pytest.raises(ValueError, match="Invalid crop_border"):
            create_pdf_redactor(crop_border="invalid")

    def test_create_pdf_redactor_negative_gap(self):
        """Test factory function with negative gap parameter."""
        with pytest.raises(ValueError, match="crop_gap must be non-negative"):
            create_pdf_redactor(crop_gap=-10.0)

    def test_extract_text_rectangles_error_handling(self, basic_config):
        """Test error handling in text rectangle extraction."""
        redactor = PDFRedactor(basic_config)
        
        # Mock a page that raises an exception
        mock_page = MagicMock()
        mock_page.get_textbox.side_effect = Exception("Test error")
        
        # Should return empty list and log warning
        rectangles = redactor._extract_text_rectangles(mock_page)
        assert rectangles == []

    def test_redact_page_error_handling(self, basic_config):
        """Test error handling in page redaction."""
        redactor = PDFRedactor(basic_config)
        
        # Mock a page that raises an exception during redaction
        mock_page = MagicMock()
        
        with patch.object(redactor, '_extract_text_rectangles') as mock_extract:
            mock_extract.side_effect = Exception("Test error")
            
            # Should return 0 and log error
            count = redactor._redact_page(mock_page)
            assert count == 0

    def test_insert_redaction_marker_error_handling(self, basic_config):
        """Test error handling in redaction marker insertion."""
        redactor = PDFRedactor(basic_config)
        
        # Mock a page that raises an exception during marker insertion
        mock_page = MagicMock()
        mock_page.insert_text.side_effect = Exception("Test error")
        
        from uuid import uuid4
        test_uuid = uuid4()
        
        # Should handle exception gracefully and log warning
        redactor._insert_redaction_marker(mock_page, test_uuid)
        # No assertion needed - just ensure it doesn't raise

    def test_redaction_result_dataclass(self):
        """Test RedactionResult dataclass functionality."""
        from uuid import uuid4
        
        uuid = uuid4()
        result = RedactionResult(
            redacted_pdf_data=b"fake_pdf",
            extracted_text="test text",
            redaction_uuid=uuid,
            page_count=3,
            redacted_areas_count=5
        )
        
        assert result.redacted_pdf_data == b"fake_pdf"
        assert result.extracted_text == "test text"
        assert result.redaction_uuid == uuid
        assert result.page_count == 3
        assert result.redacted_areas_count == 5

    def test_pdf_redaction_error_exception(self):
        """Test PDFRedactionError custom exception."""
        error = PDFRedactionError("Test error message")
        assert str(error) == "Test error message"
        assert isinstance(error, Exception)

    @pytest.mark.integration
    def test_full_redaction_workflow(self, sample_pdf_data):
        """Integration test for complete redaction workflow."""
        # Create redactor with realistic settings
        redactor = create_pdf_redactor(
            crop_border="top",
            crop_gap=100.0,
            crop_pages=None
        )
        
        # Perform redaction
        result = redactor.redact_pdf(sample_pdf_data, "integration_test.pdf")
        
        # Verify result structure  
        assert isinstance(result.redacted_pdf_data, bytes)
        assert len(result.redacted_pdf_data) > 0
        assert isinstance(result.extracted_text, str)
        assert isinstance(result.redaction_uuid, UUID)
        assert result.page_count > 0
        assert result.redacted_areas_count >= 0
        
        # Verify the redacted PDF is still valid
        assert PDFRedactor.validate_pdf_data(result.redacted_pdf_data) is True
        
        # Verify redaction UUID is present in the PDF (as marker)
        redacted_doc = pymupdf.open("pdf", result.redacted_pdf_data)
        first_page_text = redacted_doc.load_page(0).get_text()
        assert str(result.redaction_uuid) in first_page_text
        redacted_doc.close()
