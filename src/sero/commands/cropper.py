import pymupdf
from typing import Self, Iterator
from argparse import Namespace
from pathlib import Path
from uuid import UUID, uuid4
from base64 import b64encode
from alive_progress import alive_it

from sero import _defaults, types
from sero.crud import save_document, save_unit


class Cropper:
    def __init__(self, args: Namespace | None, **kwargs) -> None:
        self.pattern: str = kwargs.get("pattern") or args.pattern
        self.database_path: Path | None = getattr(args, "database_path", None)
        self.anchor_border: types.AnchorBorder = kwargs.get("anchor_border") or args.anchor_border
        self.anchor_gap: types.AnchorGap = kwargs.get("anchor_gap") or args.anchor_gap


    @classmethod
    def just_cropper(cls, filename: str, anchor_border: types.AnchorBorder, anchor_gap: types.AnchorGap) -> Self:
        cropper = cls(args=None, pattern=filename, anchor_border=anchor_border, anchor_gap=anchor_gap)
        return cropper

    @property
    def pdf_files(self) -> list[Path]:
        return Path().glob(pattern=self.pattern)
    
    def _extract_rects(self, page: pymupdf.Page) -> list[pymupdf.Rect]:
        return list([ j for i in page.get_textbox(page.rect).split("\n") for j in page.search_for(i) ])
    
    def _extract_text(self, page: pymupdf.Page) -> str:
        page_rects = self._extract_rects(page)
        cropped_texts = [ page.get_text("text", clip=rect) for rect in page_rects if self._is_inside_cropped_area(rect) ]
        return "\n".join(cropped_texts)

    def _insert_id_marker(self, page: pymupdf.Page, uuid: UUID) -> None:
        header = f"{_defaults.ID_MARKER_HEADER}: {uuid}"
        page.insert_text(_defaults.ID_MARKER_POS, header, fontsize=_defaults.ID_MARKER_SIZE, color=_defaults.ID_MARKER_COLOR)
    
    def _is_inside_cropped_area(self, rect: pymupdf.Rect) -> bool:
        return (
            (self.anchor_border == "top" and rect.y0 <= self.anchor_gap)
            or (self.anchor_border == "bottom" and rect.y1 >= self.anchor_gap)
        )

    def _process_doc(self, doc: pymupdf.Document) -> tuple[UUID, str]:
        uuid = uuid4()
        cropped_text = self._extract_text(doc.load_page(0))
        
        for page in doc:
            self._remove_text(page=page)
            self._insert_id_marker(page=page, uuid=uuid)

        return (uuid, cropped_text)

    def _remove_text(self, page: pymupdf.Page) -> None:
        page_rects = self._extract_rects(page)
        for rect in page_rects:
            if self._is_inside_cropped_area(rect):
                page.add_redact_annot(rect)
                page.apply_redactions()

    def obfuscate_docs(self) -> None | bytes:
        for fp in alive_it(self.pdf_files):
            doc = pymupdf.open(fp)
            uuid, cropped_text = self._process_doc(doc)

            if self.database_path is None:
                return b64encode(doc.write())

            save_unit(dbfile=self.database_path, unit_id=uuid, file_name=fp.name, cropped_text=cropped_text)
            save_document(dbfile=self.database_path, unit_id=uuid, data=b64encode(doc.write()))

    def retrieve_obfuscated_text(self) -> Iterator[str]:
        for fp in self.pdf_files:
            doc = pymupdf.open(fp)
            _, cropped_text = self._process_doc(doc)
            yield cropped_text

    
def make_obfuscation(args: Namespace) -> None:
    _cls = Cropper(args)
    _cls._run()
