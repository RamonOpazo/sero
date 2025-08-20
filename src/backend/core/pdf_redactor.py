import pymupdf
from typing import Dict, List, Any
from loguru import logger


class PDFRedactionError(Exception):
    pass


class PDFRedactor:
    def __init__(self):
        pass
    
    def redact_document(self, pdf_data: bytes, selections: List[Dict[str, Any]]) -> bytes:
        try:
            doc = pymupdf.open("pdf", pdf_data)
            
            if doc.is_encrypted:
                raise PDFRedactionError("PDF is encrypted")
            
            if doc.page_count == 0:
                raise PDFRedactionError("PDF has no pages")
            
            processed_pages = set()
            redaction_count = 0
            
            for selection in selections:
                page_num = selection.get('page_number')
                if page_num is None:
                    for page_idx in range(doc.page_count):
                        if page_idx not in processed_pages:
                            count = self._redact_page(doc.load_page(page_idx), [selection])
                            redaction_count += count
                            processed_pages.add(page_idx)
                else:
                    page_idx = page_num - 1
                    if 0 <= page_idx < doc.page_count:
                        if page_idx not in processed_pages:
                            processed_pages.add(page_idx)
                        count = self._redact_page(doc.load_page(page_idx), [selection])
                        redaction_count += count
            
            redacted_data = doc.write()
            doc.close()
            
            logger.info(f"Redacted {redaction_count} areas across {len(processed_pages)} pages")
            return redacted_data
            
        except Exception as e:
            if isinstance(e, PDFRedactionError):
                raise
            raise PDFRedactionError(f"Redaction failed: {str(e)}")
    
    def _redact_page(self, page: pymupdf.Page, selections: List[Dict[str, Any]]) -> int:
        redaction_count = 0
        page_rect = page.rect
        
        for selection in selections:
            rect = self._selection_to_rect(selection, page_rect)
            if rect:
                page.add_redact_annot(rect)
                redaction_count += 1
        
        if redaction_count > 0:
            page.apply_redactions()
        
        return redaction_count
    
    def _selection_to_rect(self, selection: Dict[str, Any], page_rect: pymupdf.Rect) -> pymupdf.Rect:
        try:
            x = selection['x']
            y = selection['y'] 
            width = selection['width']
            height = selection['height']
            
            page_width = page_rect.width
            page_height = page_rect.height
            
            x0 = x * page_width
            y0 = y * page_height
            x1 = x0 + (width * page_width)
            y1 = y0 + (height * page_height)
            
            return pymupdf.Rect(x0, y0, x1, y1)
            
        except (KeyError, TypeError, ValueError):
            logger.warning(f"Invalid selection data: {selection}")
            return None


def create_redactor() -> PDFRedactor:
    return PDFRedactor()
