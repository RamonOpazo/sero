import json
import base64
import re
from uuid import UUID
from getpass import getpass
from argparse import Namespace
from alive_progress import alive_it
from pathlib import Path

from sero import defaults, types, utils
from sero.config import load_settings
from sero.crud import retrieve_units, count_units, retrieve_manifest


class Retriever:
    def __init__(self, args: Namespace) -> None:
        self.configfile = Path(defaults.PATH_TO_CONFIGFILE)
        self.settings = load_settings(self.configfile)
        self.manifest = retrieve_manifest(self.settings.paths.dbfile)
        self.mode: types.RetrieveMode = args.mode
        self.regex: str = getattr(args, "regex", None)
        self.unit_id: UUID = getattr(args, "uuid", None)
        self._password: str | None = None

    @property
    def summaryfile(self) -> Path:
        return self.settings.paths.outdir / "summary.json"
    
    def _verify_password(self) -> None:
        if self.manifest.sec_hash is None:
            return

        while True:
            self._password = getpass("Enter the password: ")
            hashed_password = utils.hash_data(password=self._password, data=self._password)

            if utils.verify_hashed_data(password=self._password, data=hashed_password, stored_hash=self.manifest.sec_hash):
                print("Password confirmed successfully!")
                return

            print("\nIncorrect password! Please try again.")

    def _resolve_structured_data(self, data: bytes) -> dict[str, str]:
        decrypted_data = base64.b64decode(utils.decrypt_data(password=self._password, encrypted_data=data))
        matches = re.finditer(pattern=self.regex, string=decrypted_data)
        return { k: v for match in matches for k, v in match.groupdict().items() if v }

    def _retrieve_data(self, on_console: bool) -> None:
        if self.regex is None:
            raise ValueError("Can't recover structured data without regex definition; try running: sero setup --regex [REGEX]")

        units = retrieve_units(dbfile=self.settings.paths.dbfile, unit_id=self.unit_id)
        output = [
            {
                "id": str(unit.id),
                "created_at": str(unit.created_at),
                "file_name": unit.file_name,
                "file_size": unit.document_size,
                "structured_data": self._resolve_structured_data(unit.cropped_text)
            }
            for unit in units
        ]

        if on_console:
            print(json.dumps(output))
            return
    
        with self.summaryfile.open("wb") as fp:
            json.dump(output, fp, indent=4)

    def _retrieve_documents(self) -> None:
        units = retrieve_units(dbfile=self.settings.paths.dbfile, unit_id=self.unit_id)
        self.settings.paths.outdir.mkdir(exist_ok=True)

        for unit in alive_it(units):
            outfile = self.settings.paths.outdir / f"{unit.id}.pdf"
            
            with outfile.open("wb") as fp:
                decrypted_doc = base64.b64decode(utils.decrypt_data(password=self._password, encrypted_data=unit.document.data))
                fp.write(decrypted_doc)

    def _retrieve_summary(self) -> None:
        total_units = count_units(dbfile=self.settings.paths.dbfile)
        manifest = retrieve_manifest(dbfile=self.settings.paths.dbfile)
        print(f"Sero - {self.settings.project.name} {self.settings.project.version} summary")
        print(f" + {'database description:':<24}", self.settings.project.description or "...")
        print(f" + {'database creation date:':<24}", str(manifest.created_at))
        print(f" + {'documents obfuscated:':<24}", total_units)
        print(f" + {'contact:':<24}", self.settings.project.contact)

    def _run(self) -> None:
        self._verify_password()
        
        if self.mode == "summary:console":
            self._retrieve_summary()

        if self.mode == "data:console":
            self._retrieve_data(on_console=True)
            
        if self.mode == "data:file":
            self._retrieve_data(on_console=True)
                
        if self.mode == "documents:file":
            self._retrieve_documents()


def make_retrieval(args: Namespace) -> None:
    _cls = Retriever(args)
    _cls._run()
