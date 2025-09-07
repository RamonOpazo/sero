import pytest
from src.core.pdf_redactor import PdfRedactor, WatermarkSettings, AreaSelection


class TestPDFRedactor:
    
    @pytest.fixture
    def sample_pdf_data(self):
        return b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000125 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n182\n%%EOF"
    
    @pytest.fixture
    def sample_selection(self):
        return {
            'x': 0.1,
            'y': 0.2,
            'width': 0.3,
            'height': 0.4,
            'page_number': 0
        }
    
    def test_redactor_creation(self):
        red = PdfRedactor(watermark_settings=WatermarkSettings())
        assert red is not None
        
    def test_create_redactor_factory(self):
        red = PdfRedactor(watermark_settings=WatermarkSettings())
        assert isinstance(red, PdfRedactor)
    
    def test_redact_document_basic(self, sample_pdf_data, sample_selection):
        red = PdfRedactor(watermark_settings=WatermarkSettings())
        sel = AreaSelection.model_validate(sample_selection)
        result = red.redact_document(sample_pdf_data, [sel])
        assert isinstance(result, bytes)
        assert len(result) > 0
    
    def test_redact_document_multiple_selections(self, sample_pdf_data):
        selections = [
            {'x': 0.1, 'y': 0.1, 'width': 0.2, 'height': 0.3, 'page_number': 0},
            {'x': 0.5, 'y': 0.5, 'width': 0.3, 'height': 0.2, 'page_number': 0},
        ]
        red = PdfRedactor(watermark_settings=WatermarkSettings())
        sels = [AreaSelection.model_validate(s) for s in selections]
        result = red.redact_document(sample_pdf_data, sels)
        assert isinstance(result, bytes)
        assert len(result) > 0
    
    def test_redact_document_no_page_number(self, sample_pdf_data):
        selection = {'x': 0.1, 'y': 0.2, 'width': 0.3, 'height': 0.4, 'page_number': None}
        red = PdfRedactor(watermark_settings=WatermarkSettings())
        sel = AreaSelection.model_validate(selection)
        result = red.redact_document(sample_pdf_data, [sel])
        assert isinstance(result, bytes)
    
    def test_redact_document_invalid_pdf(self):
        invalid_data = b"not a pdf"
        selection = {'x': 0.1, 'y': 0.2, 'width': 0.3, 'height': 0.4, 'page_number': 0}
        
        red = PdfRedactor(watermark_settings=WatermarkSettings())
        # Current implementation raises a low-level error from PyMuPDF; accept any exception
        with pytest.raises(Exception):
            red.redact_document(invalid_data, [AreaSelection.model_validate(selection)])
    
    def test_redact_document_empty_selections(self, sample_pdf_data):
        red = PdfRedactor(watermark_settings=WatermarkSettings())
        result = red.redact_document(sample_pdf_data, [])
        assert isinstance(result, bytes)
    
    def test_selection_to_rect_conversion(self, sample_pdf_data):
        import pymupdf
        
        doc = pymupdf.open("pdf", sample_pdf_data)
        page = doc.load_page(0)
        page_rect = page.rect
        
        selection = AreaSelection(x=0.1, y=0.2, width=0.3, height=0.4, page_number=None)
        rect = selection.as_rect(page)
        
        assert rect is not None
        assert rect.x0 == 0.1 * page_rect.width
        assert rect.y0 == 0.2 * page_rect.height
        
        doc.close()
    
    def test_selection_to_rect_invalid_data(self, sample_pdf_data):
        import pymupdf
        
        doc = pymupdf.open("pdf", sample_pdf_data)
        invalid_selection = {'x': 'invalid'}
        # Building AreaSelection will fail; ensure graceful handling via try/except
        with pytest.raises(Exception):
            _ = AreaSelection.model_validate(invalid_selection)
        doc.close()
