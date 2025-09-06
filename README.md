# Sero: A Secure Document Redaction and Obfuscation Service

**Sero** (pronounced */ˈsɛ.ɾo/*) **E**vilishly **R**edacts and **O**bfuscates you PDF files. It is a high-performance service, specifically designed to handle clinical documents and ensure that critical information from patients and health providers remains confidential.

## Introduction

In the healthcare sector, protecting patient and provider data is not just a feature—it's a legal and ethical requirement. Clinical documents, such as medical records, lab results, and research papers, are filled with personally identifiable information (PII) that must be handled with the utmost care. Sero provides a robust, secure, and reliable solution for this critical task.

Sero is a service designed to automate the process of identifying and removing sensitive data from PDF documents. By leveraging a powerful backend and a secure, project-based workflow, it allows healthcare professionals to share documents with confidence, knowing that private information is protected.

## Key Features

- **Project-Based Organization**: Group your clinical documents into distinct, password-protected projects. Each project is an isolated environment, ensuring data separation and security.
- **End-to-End Encryption**: Documents are encrypted upon upload using a key derived from your project password. They are stored in an encrypted state and can only be decrypted with the correct password.
- **Powerful API**: A clean, modern RESTful API for all interactions, complete with interactive documentation.
- **Template-Driven Processing**: Define reusable `Selection` and `Prompt` templates at the project level. These can be applied to documents to guide automated data extraction or obfuscation workflows.
- **Bulk Operations**: Efficiently upload multiple documents or manage templates in batches.
- **Solid Foundation**: Built on a modern, reliable tech stack for performance and maintainability.

## Technical Design

Sero is built with a focus on security, performance, and maintainability. The technical stack includes:

- **Backend**: Python 3.13+ & FastAPI
- **Database**: DuckDB (for a fast, embedded, and zero-dependency experience)
- **ORM**: SQLAlchemy 2.0 (for robust and modern database interaction)
- **Data Validation**: Pydantic
- **Security**: Cryptography (Fernet symmetric encryption) & Passlib (for password hashing)

## Getting Started

Sero is packaged as a uv tool and can be installed via provided install scripts or directly with uv. Python dependencies and all project actions are managed with uv.

### Installation

Fastest: one-liners
- Linux/macOS:
  ```bash
  curl -LsSf https://raw.githubusercontent.com/RamonOpazo/sero/main/install.sh | sh
  ```
- Windows (PowerShell):
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -Command "iex (irm https://raw.githubusercontent.com/RamonOpazo/sero/main/install.ps1)"
  ```
  If you are already in PowerShell:
  ```powershell
  Set-ExecutionPolicy -Scope Process Bypass -Force
  iex (irm https://raw.githubusercontent.com/RamonOpazo/sero/main/install.ps1)
  ```

From a local clone
- Linux/macOS:
  ```bash
  ./install.sh
  ```
- Windows (PowerShell):
  ```powershell
  Unblock-File .\install.ps1
  .\install.ps1
  ```

Where the sero command is installed
- Linux/macOS: ~/.local/bin/sero (or $XDG_BIN_HOME/sero)
- Windows: %LOCALAPPDATA%\uv\bin\sero.exe
If the command isn’t found, add the directory above to your PATH or restart the terminal.

Install directly with uv (no scripts)
```bash
uv tool install --from git+https://github.com/RamonOpazo/sero.git sero
```

From source (development)
```bash
git clone https://github.com/RamonOpazo/sero.git
cd sero
uv sync --all-groups
# Run with hot reload (dev):
uv run sero-dev
# Or run the server (prod):
uv run sero
```

### Keyring backend (required)
Sero stores its application secret key in the OS keyring. On Linux you must have a Secret Service provider running; macOS and Windows typically work out of the box.
- Linux examples:
  - Debian/Ubuntu: `sudo apt-get install gnome-keyring`
  - Fedora: `sudo dnf install gnome-keyring`
  - Arch/Endeavour: `sudo pacman -S gnome-keyring libsecret`
  - KDE users can use KWallet (kwallet/kwalletmanager)
After installation, log out and back in (or ensure the keyring daemon is running).

Verify the backend:
```bash
uv run python -m keyring --list-backends
```
You should see a real backend (e.g., SecretService on Linux, macOS Keychain, or Windows Credential Locker).

### Data locations
By default, Sero uses per-user OS-appropriate directories:
- Linux:
  - DB: ~/.local/share/sero/sero.sqlite
  - Logs: ~/.local/state/sero/logs/app.jsonl
  - Output: ~/.local/share/sero/output
- macOS:
  - DB: ~/Library/Application Support/sero/sero.sqlite
  - Logs: ~/Library/Logs/sero/app.jsonl
  - Output: ~/Library/Application Support/sero/output
- Windows:
  - DB: %LOCALAPPDATA%\sero\sero.sqlite
  - Logs: %LOCALAPPDATA%\sero\logs\app.jsonl
  - Output: %LOCALAPPDATA%\sero\output

Environment overrides
Use environment variables with prefix SERO_ and nested keys separated by __:
- SERO_DB__FILEPATH=/custom/path/sero.sqlite
- SERO_LOG__FILEPATH=/custom/path/app.jsonl
- SERO_PROCESSING__DIRPATH=/custom/output
These can be set in your shell or a .env file in your working directory.

### Running the Service
Once installed, run:
```bash
sero
```

This starts the FastAPI server. API documentation:
- Swagger UI: http://localhost:8000/api/docs
- OpenAPI schema: http://localhost:8000/api/openapi.json

## Usage Workflow

1.  **Create a Project**: A project is a secure container for your documents. It is protected by a password that is used to derive the encryption key for all documents within it.
2.  **Upload Documents**: Upload your PDF files to a project. Sero encrypts them on the fly and stores them securely.
3.  **Define Templates (Optional)**: Create reusable `Selection` and `Prompt` templates to guide the redaction process. A `Selection` can define a specific area on a page, while a `Prompt` can provide instructions for data extraction.
4.  **Process & Obfuscate**: Apply templates to your documents to identify and remove sensitive data. Sero will create a new, obfuscated version of the file.
5.  **Download Securely**: Download the original or obfuscated files by providing the correct project password to decrypt them.

## Contributing

We welcome contributions to Sero! If you would like to contribute, please read our [Contributing Guidelines](.github/CONTRIBUTING.md).

## License

The license for this project has not yet been determined. Please check back later for more information.