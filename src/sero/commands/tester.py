import re
import json
from argparse import Namespace
from pathlib import Path
from base64 import b64decode

from .cropper import Cropper
from sero import types, defaults


class Tester:
    def __init__(self, args: Namespace) -> None:
        self._args = args
        self.filepath: Path = args.file
        self.regex: str | None = getattr(args, "regex", None)
        self.anchor_border: types.AnchorBorder = args.anchor_border
        self.anchor_gap: types.AnchorGap = args.anchor_gap
        self.test_type: types.TestType = args.test_type

    @property
    def args(self) -> Namespace:
        return self._args

    def _attempt_data_extraction(self) -> None:
        if not isinstance(self.regex, str):
            raise ValueError("Must provide a regular expression in order to attempt data extraction")
        
        cropper = Cropper.just_cropper(filename=self.filepath.as_posix(), anchor_border=self.anchor_border, anchor_gap=self.anchor_gap)
        cropped_text = next(cropper.retrieve_obfuscated_text())
        matches = re.finditer(pattern=self.regex, string=cropped_text)
        groups = { k: v for match in matches for k, v in match.groupdict().items() if v }
        print(json.dumps(groups))

    def _attempt_document_cropping(self) -> None:
        cropper = Cropper.just_cropper(filename=self.filepath.as_posix(), anchor_border=self.anchor_border, anchor_gap=self.anchor_gap)
        doc_bytes = cropper.obfuscate_docs()

        with (defaults.PATH_TO_OUTDIR / "crop_test.pdf").open("wb") as fp:
            fp.write(b64decode(doc_bytes))

    def make_attempt(self) -> None:
        if self.test_type == "cropping":
            self._attempt_document_cropping()

        if self.test_type == "extraction":
            self._attempt_data_extraction()