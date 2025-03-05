from argparse import Namespace
from pathlib import Path

from sero.crud import save_metadata


class Setuper:
    def __init__(self, args: Namespace) -> None:
        self.database_path: Path = args.database_path
        self.regex: str | None = args.regex
        self.description: str | None = args.description

    def configure_metadata(self) -> None:
        save_metadata(db_path=self.database_path, description=self.description, regex=self.regex)
