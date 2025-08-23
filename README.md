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

### Prerequisites

Ensure you have Python 3.13 or higher installed on your system.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone <your-repository-url>
    cd sero
    ```

2.  **Create a virtual environment and install dependencies:**
    This project uses `uv` for dependency management.
    ```sh
    # Create a virtual environment
    python -m venv .venv
    source .venv/bin/activate

    # Install dependencies using uv
    pip install uv
    uv pip install -r requirements.txt
    ```

### Running the Service

Once the dependencies are installed, you can start the service with a single command:

```sh
sero
```

This will launch the Uvicorn server. You should see output similar to this:

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using watchfiles
INFO:     Started server process [12347]
INFO:     Waiting for application startup.
INFO:     Starting sero...
INFO:     Initializing DuckDB database: duckdb:////path/to/sero.duckdb
INFO:     DuckDB database tables created successfully
INFO:     Application startup complete.
```

Your Sero instance is now live. You can access the interactive API documentation at **http://localhost:8000/docs**.

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