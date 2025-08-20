import pytest
from src.backend.core.pdf_redactor import PDFRedactor, PDFRedactionError, create_redactor


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
            'page_number': 1
        }
    
    def test_redactor_creation(self):
        redactor = PDFRedactor()
        assert redactor is not None
        
    def test_create_redactor_factory(self):
        redactor = create_redactor()
        assert isinstance(redactor, PDFRedactor)
    
    def test_redact_document_basic(self, sample_pdf_data, sample_selection):
        redactor = PDFRedactor()
        result = redactor.redact_document(sample_pdf_data, [sample_selection])
        assert isinstance(result, bytes)
        assert len(result) > 0
    
    def test_redact_document_multiple_selections(self, sample_pdf_data):
        selections = [
            {'x': 0.1, 'y': 0.1, 'width': 0.2, 'height': 0.3, 'page_number': 1},
            {'x': 0.5, 'y': 0.5, 'width': 0.3, 'height': 0.2, 'page_number': 1},
        ]
        redactor = PDFRedactor()
        result = redactor.redact_document(sample_pdf_data, selections)
        assert isinstance(result, bytes)
        assert len(result) > 0
    
    def test_redact_document_no_page_number(self, sample_pdf_data):
        selection = {'x': 0.1, 'y': 0.2, 'width': 0.3, 'height': 0.4}
        redactor = PDFRedactor()
        result = redactor.redact_document(sample_pdf_data, [selection])
        assert isinstance(result, bytes)
    
    def test_redact_document_invalid_pdf(self):
        invalid_data = b"not a pdf"
        selection = {'x': 0.1, 'y': 0.2, 'width': 0.3, 'height': 0.4, 'page_number': 1}
        
        redactor = PDFRedactor()
        with pytest.raises(PDFRedactionError):
            redactor.redact_document(invalid_data, [selection])
    
    def test_redact_document_empty_selections(self, sample_pdf_data):
        redactor = PDFRedactor()
        result = redactor.redact_document(sample_pdf_data, [])
        assert isinstance(result, bytes)
    
    def test_selection_to_rect_conversion(self, sample_pdf_data):
        import pymupdf
        
        redactor = PDFRedactor()
        doc = pymupdf.open("pdf", sample_pdf_data)
        page = doc.load_page(0)
        page_rect = page.rect
        
        selection = {'x': 0.1, 'y': 0.2, 'width': 0.3, 'height': 0.4}
        rect = redactor._selection_to_rect(selection, page_rect)
        
        assert rect is not None
        assert rect.x0 == 0.1 * page_rect.width
        assert rect.y0 == 0.2 * page_rect.height
        
        doc.close()
    
    def test_selection_to_rect_invalid_data(self, sample_pdf_data):
        import pymupdf
        
        redactor = PDFRedactor()
        doc = pymupdf.open("pdf", sample_pdf_data)
        page = doc.load_page(0)
        page_rect = page.rect
        
        invalid_selection = {'x': 'invalid'}
        rect = redactor._selection_to_rect(invalid_selection, page_rect)
        
        assert rect is None
        doc.close()
