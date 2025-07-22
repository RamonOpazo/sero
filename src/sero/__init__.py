import sys
import subprocess
import uvicorn
from pathlib import Path


def main() -> None:
    """Start the Sero API server in production mode."""
    uvicorn.run("sero.app:app", host="0.0.0.0", port=8000)


def dev() -> None:
    """Start the development server with hot reload."""
    uvicorn.run("sero.app:app", host="127.0.0.1", port=8000, reload=True)


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
            "--cov=src/sero", 
            "--cov-report=html",
            "--cov-report=term-missing"
        ], check=True)
        print("\nCoverage report generated in .coverage-html/index.html")
        sys.exit(result.returncode)
    except subprocess.CalledProcessError as e:
        sys.exit(e.returncode)
    except FileNotFoundError:
        print("Error: uv not found. Please install uv first.")
        sys.exit(1)


def db_init() -> None:
    """Initialize the database with tables."""
    try:
        from sero.core.database import init_db
        init_db()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Error initializing database: {e}")
        sys.exit(1)


def version() -> None:
    """Show Sero version information."""
    try:
        # Try to read version from pyproject.toml
        pyproject_path = Path(__file__).parent.parent.parent / "pyproject.toml"
        if pyproject_path.exists():
            import tomllib
            with open(pyproject_path, "rb") as f:
                data = tomllib.load(f)
                version = data.get("project", {}).get("version", "unknown")
                name = data.get("project", {}).get("name", "sero")
                print(f"{name} v{version}")
        else:
            print("Sero (development version)")
    except Exception:
        print("Sero (version unknown)")
