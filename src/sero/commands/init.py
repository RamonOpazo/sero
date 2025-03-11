import re
import bcrypt
import toml
import shutil
from getpass import getpass
from pathlib import Path
from argparse import Namespace
from base64 import b64encode

from sero import consts, defaults
from sero.db import init_db
from sero.crud import save_manifest


class Initializer:
    base_path: Path
    project_name: str
    project_path: Path
    project_description: str
    contact_name: str
    contact_email: str
    db_license: str
    db_license_path: Path
    hashed_password: bytes | None

    def __init__(self, args: Namespace) -> None:
        base_path: Path = args.dirpath.resolve()

        if not base_path.exists():
            raise ValueError("The path provided does not exist")

        if not base_path.is_relative_to(Path.home()):
            raise ValueError("Projects can only be initialized relative to the home directory")

        self.base_path = base_path

    @property
    def configfile(self) -> Path:
        return self.project_path / defaults.PATH_TO_CONFIGFILE

    @property
    def dbfile(self) -> Path:
        return self.project_path / defaults.PATH_TO_DBFILE

    @property
    def db_host(self) -> str:
        f"duckdb:///{self.dbfile}"

    @property
    def config(self) -> dict[str]:
        return {
            "project": {
                "name": self.project_name,
                "description": self.project_description,
                "version": defaults.PROJECT_VERSION,
                "contact": f"{self.contact_name} <{self.contact_email}>"
            },
            "paths": {
                "docsdir": defaults.PATH_TO_DOCSDIR,
                "outdir": defaults.PATH_TO_OUTDIR,
                "dbfile": defaults.PATH_TO_DBFILE
            },
            "crop": {
                "border": defaults.CROP_BORDER,
                "gap": defaults.CROP_GAP
            },
            "id_marker": {
                "header": defaults.ID_MARKER_HEADER,
                "position": defaults.ID_MARKER_POS,
                "size": defaults.ID_MARKER_SIZE,
                "color": defaults.ID_MARKER_COLOR
            }
        }

    def _init_prompt(self) -> None:
        self.project_name = self._prompt_project_name()
        self.project_path = self.base_path / self.project_name
        self.project_description = self._prompt_project_description()
        self.contact_name = self._prompt_contact_name()
        self.contact_email = self._prompt_contact_email()
        self.db_license = self._prompt_db_license()
        self.db_license_path = self.project_path / "LICENSE"
        self.hashed_password = self._prompt_password()

    def _prompt_project_name(self) -> str:
        while True:
            name = input("Provide a name for your project: ")
            if re.match(r"^[a-zA-Z_]{2}[a-zA-Z0-9\-_]+$", name):
                return name
            
            print("\nInvalid project name! Names must start with a letter or underscore, followed by letters, numbers, dashes or underscores, and be at least three characters long")

    def _prompt_project_description(self) -> str:
        return input("Provide a brief description of your project: ")

    def _prompt_contact_name(self) -> str:
        while True:
            name = input("Provide a contact name: ")
            if re.match(r"^[a-zA-Z_]+(\s[a-zA-Z]+)*$", name):
                return name
            
            print("\nInvalid contact name! Names must start with a letter and contain only letters and single spaces")

    def _prompt_contact_email(self) -> str:
        while True:
            email = input("Provide a contact email: ")
            if re.match(r"^[a-z]+([\.\-_][a-z0-9]+)*@[a-z0-9]+([\.\-_][a-z0-9]+)*[\.][a-z][a-z]+$", email):
                return email
            
            print(f"\nInvalid contact email: {email}")
            print("Only valid emails are allowed")

    def _prompt_db_license(self) -> str:
        print("Select a license for your database:")
        print("  1 - Open Database License (ODbL 1.0)")
        print("  2 - Open Data Commons Attribution License (ODC-By 1.0)")
        print("  3 - Creative Commons Attribution-NonCommercial (CC BY-NC 4.0)")
        print("  4 - Creative Commons Attribution-ShareAlike (CC BY-SA 4.0)")

        def _choose_license() -> str | None:
            match input("Enter the number corresponding to the license you want to use [*1/2/3/4]: "):
                case "" | "1":
                    return "ODbL"
                case "2":
                    return "ODC-By"
                case "3":
                    return "CC BY-NC"
                case "4":
                    return "CC BY-SA"
                case _:
                    return None

        while True:
            license_choice = _choose_license()

            if license_choice in consts.DB_LICENSES:
                print(f"\nYou selected: {consts.DB_LICENSES[license_choice]['name']}")
                print(f"License Information: {consts.DB_LICENSES[license_choice]['description']}")
                print(f"Official License Link: {consts.DB_LICENSES[license_choice]['link']}")
                return license_choice
            
            print("\nInvalid choice! Please select a valid license")

    def _prompt_password(self) -> bytes | None:
        while True:
            match input("Do you want to secure your data with a password (strongly recommended) [Y/n]: ").lower():
                case "" | "y" | "yes":
                    break
                case "n" | "no":
                    return None
                case _:
                    print("\nInvalid answer, please respond y or n")
        while True:
            _ = getpass("Enter a password to secure the data: ")

            if len(_) < 8:
                print("The password must be at least 8 characters long")
                continue

            hashed_password = bcrypt.hashpw(_.encode('utf-8'), bcrypt.gensalt())
            confirm_password = getpass("Confirm your password: ")

            if bcrypt.checkpw(confirm_password.encode('utf-8'), hashed_password):
                print("Password confirmed successfully!")
                return b64encode(hashed_password)
            
            print("\nPasswords do not match! Please try again.")

    def _create_project_files(self) -> None:
        print(f"Project directory: {self.project_path.as_posix()}")
        self.project_path.mkdir(exist_ok=True)

        print("Creating configuration file...")
        with self.configfile.open("w") as fp:
            toml.dump(self.config, fp)
        
        print("Creating LICENSE file...")
        license_source = consts.SOURCEDIR / "licenses" / self.db_license
        shutil.copy(license_source, self.db_license_path)

        print("Initializing the database...")
        init_db(self.dbfile)

    def _run(self) -> None:
        self._init_prompt()
        self._create_project_files()
        sero_version = get_sero_version()
        save_manifest(self.dbfile, sero_version=sero_version, sec_hash=self.hashed_password)
        print("\nProject initialization successful!")


def make_init(args: Namespace) -> None:
    _cls = Initializer(args)
    _cls._run()


def get_sero_version() -> str:
    pyprojectfile = defaults.SOURCEDIR.parent.parent / "pyproject.toml"
    with pyprojectfile.open("r") as fp:
        config = toml.load(fp)
        return config["project"]["version"]
