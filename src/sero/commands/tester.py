import re
import json
from argparse import Namespace
from pathlib import Path
from base64 import b64decode

from .cropper import Cropper
from sero import _defaults, types


class Tester:
    def __init__(self, args: Namespace) -> None:
        self._args = args
        self.filepath: Path = args.filepath
        self.regex: str | None = getattr(args, "regex", None)
        self.anchor_border: types.AnchorBorder = args.anchor_border
        self.anchor_gap: types.AnchorGap = args.anchor_gap
        self.test_action: types.TestAction = args.test_action

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

        with (_defaults.PATH_TO_OUTDIR / "crop_test.pdf").open("wb") as fp:
            fp.write(b64decode(doc_bytes))

    def _run(self) -> None:
        if self.test_action == "cropping":
            self._attempt_document_cropping()

        if self.test_action == "extraction":
            self._attempt_data_extraction()


def make_test(args: Namespace) -> None:
    _cls = Tester(args)
    _cls._run()
