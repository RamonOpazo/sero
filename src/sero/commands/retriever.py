import json
import base64
from uuid import UUID
from argparse import Namespace
from alive_progress import alive_it
from pathlib import Path

from sero import types
from sero.crud import retrieve_units, count_units, retrieve_metadata


class Retriever:
    def __init__(self, args: Namespace) -> None:
        self.path_to_dbfile: Path = args.database_path
        self.path_to_outdir: Path = args.output_path
        self.retrieve_type: types.RetrieveType = args.retrieve_type
        self.unit_id: UUID = args.uuid

    def _retrieve_data(self, on_console: bool) -> None:
        units = retrieve_units(db_path=self.path_to_dbfile, unit_id=self.unit_id)
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
        units = retrieve_units(db_path=self.path_to_dbfile, unit_id=self.unit_id)
        self.path_to_outdir.mkdir(exist_ok=True)

        for unit in alive_it(units):
            with (self.path_to_outdir / f"{unit.id}.pdf").open("wb") as fp:
                fp.write(base64.b64decode(unit.document.data))

    def _retrieve_summary(self) -> None:
        total_units = count_units(db_path=self.path_to_dbfile)
        metadata = retrieve_metadata(db_path=self.path_to_dbfile)
        print("Sero - Summary of current state")
        print(f" {'=> database description:':<27}", metadata.description or "...")
        print(f" {'=> database creation date:':<27}", str(metadata.created_at))
        print(f" {'=> data extraction regex:':<27}", f"r{metadata.regex!r}gm")
        print(f" {'=> documents obfuscated:':<27}", total_units)

    def recover_docs(self) -> None:
        if self.retrieve_type == "summary:console":
            self._retrieve_summary()

        if self.retrieve_type == "data:console":
            self._retrieve_data(on_console=True)
            
        if self.retrieve_type == "data:file":
            self._retrieve_data(on_console=True)
                
        if self.retrieve_type == "documents:file":
            self._retrieve_documents()