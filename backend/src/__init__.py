import sys
import subprocess
import uvicorn
from importlib.metadata import PackageNotFoundError, version as pkg_version

from src.core.database import db_manager
from src.core.config import settings


# # Back-compat import alias: keep supporting `..` after moving to backend/src
# import importlib
# _pkg = sys.modules[__name__]
# sys.modules.setdefault("backend", _pkg)
# for _name in ("api", "core", "crud", "db", "service", "app"):
#     try:
#         _mod = importlib.import_module(f".{_name}", __name__)
#         sys.modules[f"backend.{_name}"] = _mod
#     except Exception:
#         # Ignore missing during certain tooling steps
#         pass

DIST_NAME = "sero"


def _version_from_metadata() -> str:
    try:
        return pkg_version(DIST_NAME)
    except PackageNotFoundError:
        return ""


def _version_from_git() -> str:
    try:
        # Prefer annotated tags; fallback prints commit when no tags
        result = subprocess.run(
            ["git", "describe", "--tags", "--dirty", "--always"],
            check=True,
            capture_output=True,
            text=True,
        )
        v = result.stdout.strip()
        # Normalize common 'v' prefix from tags like v1.2.3
        return v[1:] if v.startswith("v") else v
    except Exception:
        return ""


def get_version() -> str:
    """Resolve the current Sero version.
    Order of resolution:
    1) Installed package metadata (importlib.metadata)
    2) Git describe (for editable/source checkouts)
    3) Fallback to a sentinel version
    """
    v = _version_from_metadata() or _version_from_git()
    return v or "0.0.0+unknown"


__version__ = get_version()


def main() -> None:
    """Start the Sero API server in production mode."""
    uvicorn.run("src.app:app", host="0.0.0.0", port=8000)


def dev() -> None:
    """Start the development server with hot reload."""
    uvicorn.run("src.app:app", host="127.0.0.1", port=8000, reload=True)


def test() -> None:
    """Run all tests."""
    try:
        result = subprocess.run(["uv", "run", "pytest"], check=True)
        sys.exit(result.returncode)
    except subprocess.CalledProcessError as e:
        sys.exit(e.returncode)
    except FileNotFoundError:
        print("Error: uv not found. Please install uv first.")
        sys.exit(1)


def test_cov() -> None:
    """Run tests with coverage report."""
    try:
        result = subprocess.run([
            "uv", "run", "pytest",
            "--cov=src",
            "--cov-report=html",
            "--cov-report=term-missing",
        ], check=True)
        print("\nCoverage report generated in .coverage_html/index.html")
        sys.exit(result.returncode)
    except subprocess.CalledProcessError as e:
        sys.exit(e.returncode)
    except FileNotFoundError:
        print("Error: uv not found. Please install uv first.")
        sys.exit(1)


def db_init() -> None:
    """Initialize the SQLite database with tables."""
    try:
        
        print(f"Initializing SQLite database at: {settings.db.filepath}")
        db_manager.init()
        print("Database initialized successfully")
        print(f"Database location: {settings.db.filepath.absolute()}")
        print("Database engine: SQLite with WAL mode")
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        sys.exit(1)


def version() -> None:
    """Show Sero version information (CLI)."""
    try:
        print(f"{DIST_NAME} v{get_version()}")
    except Exception:
        print("Sero (version unknown)")
