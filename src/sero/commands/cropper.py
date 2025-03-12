import pymupdf
import base64
from getpass import getpass
from typing import Self, Iterator
from argparse import Namespace
from pathlib import Path
from uuid import UUID, uuid4
from alive_progress import alive_it

from sero import defaults, types, utils
from sero.config import load_settings
from sero.crud import save_document, save_unit, retrieve_manifest


class Cropper:
    def __init__(self, args: Namespace | None, **kwargs) -> None:
        self.configfile = Path(defaults.PATH_TO_CONFIGFILE)
        self.settings = load_settings(self.configfile)
        self.manifest = retrieve_manifest(self.settings.paths.dbfile)
        self.pattern: str = kwargs.get("pattern") or args.pattern
        self.crop_border: types.CropBorder = kwargs.get("crop_border") or getattr(args, "crop_border", None) or self.settings.crop.border
        self.crop_gap: types.CropGap = kwargs.get("crop_gap") or getattr(args, "crop_gap", None) or self.settings.crop.gap
        self.crop_pages: types.CropPages = kwargs.get("crop_pages") or getattr(args, "crop_pages", None) or self.settings.crop.pages
        self._password: str | None = None
        self._is_valid_pattern()

    @classmethod
    def for_testing(cls, filename: Path, crop_border: types.CropBorder, crop_gap: types.CropGap, crop_pages: types.CropPages) -> Self:
        cropper = cls(args=None, pattern=filename.as_posix(), crop_border=crop_border, crop_gap=crop_gap, crop_pages=crop_pages)
        return cropper

    @property
    def pdf_files(self) -> list[Path]:
        files = Path().glob(pattern=self.pattern)
        return alive_it(files)
    
    @property
    def crop_ranges(self) -> set[int] | None:
        return utils.parse_page_ranges(self.crop_pages)

    def _is_valid_pattern(self) -> None:
        files = Path().glob(pattern=self.pattern)
        if not any(files):
            raise ValueError("No files found!")
    
    def _verify_password(self) -> None:
        if self.manifest.sec_hash is None:
            return

        while True:
            self._password = getpass("Enter the password: ")
            expected_hashed_password = base64.b64decode(self.manifest.sec_hash)

            if utils.verify_hashed_data(password=self._password, data=self._password, stored_hash=expected_hashed_password):
                print("Password confirmed successfully!")
                return

            print("\nIncorrect password! Please try again.")

    def _extract_rects(self, page: pymupdf.Page) -> list[pymupdf.Rect]:
        return list([ j for i in page.get_textbox(page.rect).split("\n") for j in page.search_for(i) ])
    
    def _extract_text(self, page: pymupdf.Page) -> str:
        page_rects = self._extract_rects(page)
        cropped_texts = [ page.get_text("text", clip=rect) for rect in page_rects if self._is_inside_cropped_area(rect) ]
        return "\n".join(cropped_texts)

    def _insert_marker(self, page: pymupdf.Page, uuid: UUID) -> None:
        marker = f"{self.settings.marker.header}: {uuid}"
        page.insert_text(self.settings.marker.position, marker, fontsize=self.settings.marker.size, color=self.settings.marker.rgb_color)
    
    def _is_inside_cropped_area(self, rect: pymupdf.Rect) -> bool:
        crop_border = self.crop_border
        crop_gap = self.crop_gap

        return (
            (crop_border == "top" and rect.y0 <= crop_gap)
            or (crop_border == "bottom" and rect.y1 >= crop_gap)
        )

    def _process_doc(self, doc: pymupdf.Document) -> tuple[UUID, str]:
        uuid = uuid4()
        cropped_text = self._extract_text(doc.load_page(0))
        
        for i, page in enumerate(doc, 1):
            if (self.crop_ranges is None) or (i in self.crop_ranges):    
                self._remove_text(page=page)
                self._insert_marker(page=page, uuid=uuid)

        return (uuid, cropped_text)

    def _remove_text(self, page: pymupdf.Page) -> None:
        page_rects = self._extract_rects(page)
        for rect in page_rects:
            if self._is_inside_cropped_area(rect):
                page.add_redact_annot(rect)
                page.apply_redactions()

    def _obfuscate(self) -> None:
        for fp in self.pdf_files:
            doc = pymupdf.open(fp)
            uuid, cropped_text = self._process_doc(doc)

            _text = base64.b64encode(cropped_text.encode()) if self._password is None else utils.encrypt_data(password=self._password, data=cropped_text.encode())
            _data = base64.b64encode(doc.write()) if self._password is None else utils.encrypt_data(password=self._password, data=doc.write())

            save_unit(dbfile=self.settings.paths.dbfile, unit_id=uuid, file_name=doc.name, cropped_text=_text)
            save_document(dbfile=self.settings.paths.dbfile, unit_id=uuid, data=_data)
        
    def _obfuscate_and_return(self, get_doc: bool = False, get_text: bool = False, get_uuid: bool = False) -> Iterator[bytes] | Iterator[str] | Iterator[UUID]:
        for fp in self.pdf_files:
            doc = pymupdf.open(fp)
            uuid, cropped_text = self._process_doc(doc)

            if get_doc:
                yield doc.write()

            if get_text:
                yield cropped_text

            if get_uuid:
                yield uuid

    def _run(self) -> None:
        self._verify_password()
        self._obfuscate()

    
def make_obfuscation(args: Namespace) -> None:
    _cls = Cropper(args)
    _cls._run()
