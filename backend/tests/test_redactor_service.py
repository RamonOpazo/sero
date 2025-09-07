import pytest

from src.service.redactor_service import get_redactor_service
from src.core.pdf_redactor import AreaSelection


class TestRedactorService:
    def test_redact_simple_pdf(self):
        svc = get_redactor_service()
        # Minimal PDF bytes (from fixtures used elsewhere)
        pdf = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000125 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n182\n%%EOF"
        selections = [AreaSelection(x=0.1, y=0.1, width=0.2, height=0.2, page_number=0)]
        out = svc.redact(pdf_data=pdf, selections=selections)
        assert isinstance(out, (bytes, bytearray)) and len(out) > 0

    def test_redact_raises_on_encrypted_or_invalid(self, monkeypatch):
        svc = get_redactor_service()
        # Invalid PDF should raise via underlying core redactor
        with pytest.raises(Exception):
            svc.redact(pdf_data=b"not a pdf", selections=[])
