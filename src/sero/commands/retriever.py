import json
import base64
from uuid import UUID
from argparse import Namespace
from alive_progress import alive_it
from pathlib import Path

from sero import types
from sero.crud import retrieve_units, count_units, retrieve_manifest


class Retriever:
    def __init__(self, args: Namespace) -> None:
        self.path_to_dbfile: Path = args.database_path
        self.path_to_outdir: Path = args.output_path
        self.retrieve_action: types.RetrieveAction = args.retrieve_action
        self.unit_id: UUID = args.uuid

    def _retrieve_data(self, on_console: bool) -> None:
        units = retrieve_units(dbfile=self.path_to_dbfile, unit_id=self.unit_id)
        output = [
            {
                "id": str(unit.id),
                "created_at": str(unit.created_at),
                "file_name": unit.file_name,
                "file_size": unit.document_size,
                "structured_data": unit.structured_data
            }
            for unit in units
        ]

        if on_console:
            print(json.dumps(output))
            return
    
        with (self.path_to_outdir / "summary.json").open("wb") as fp:
            json.dump(output, fp, indent=4)

    def _retrieve_documents(self) -> None:
        units = retrieve_units(dbfile=self.path_to_dbfile, unit_id=self.unit_id)
        self.path_to_outdir.mkdir(exist_ok=True)

        for unit in alive_it(units):
            with (self.path_to_outdir / f"{unit.id}.pdf").open("wb") as fp:
                fp.write(base64.b64decode(unit.document.data))

    def _retrieve_summary(self) -> None:
        total_units = count_units(dbfile=self.path_to_dbfile)
        manifest = retrieve_manifest(dbfile=self.path_to_dbfile)
        print("Sero - Summary of current state")
        print(f" {'=> database description:':<27}", manifest.description or "...")
        print(f" {'=> database creation date:':<27}", str(manifest.created_at))
        print(f" {'=> data extraction regex:':<27}", f"r{manifest.regex!r}gm")
        print(f" {'=> documents obfuscated:':<27}", total_units)

    def _run(self) -> None:
        if self.retrieve_action == "summary:console":
            self._retrieve_summary()

        if self.retrieve_action == "data:console":
            self._retrieve_data(on_console=True)
            
        if self.retrieve_action == "data:file":
            self._retrieve_data(on_console=True)
                
        if self.retrieve_action == "documents:file":
            self._retrieve_documents()


def make_retrieval(args: Namespace) -> None:
    _cls = Retriever(args)
    _cls._run()
