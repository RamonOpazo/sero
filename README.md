# 🛡️ Sero: Document Guardian Service

**Sero** (pronounced */ˈsɛ.ɾo/*) **Evilishly Redacts and Obfuscates** your sensitive PDF files with precision and style—like its name clearly states. Built on FastAPI, Sero is a secure, high-performance service designed to strip out private data, mask confidential content, and protect your documents like a digital shredder with brains. Whether you're handling legal contracts, reports, or raw exports, Sero ensures your files stay clean, compliant, and untouchably safe.

Think of it as a digital vault with a built-in, slightly mischievous, intelligent assistant, ensuring your data is safe, sound, and ready for action.

## ✨ Core Features

- **Project-Based Organization**: Group your documents into distinct, password-protected projects. Each project is an isolated silo, ensuring data separation and security.
- **End-to-End Encryption**: Documents are encrypted at the point of upload using a key derived from your project password and a unique salt. They are stored in an encrypted state and can only be decrypted with the correct password.
- **Powerful API**: A clean, modern RESTful API built with FastAPI for all interactions, complete with interactive documentation.
- **Template-Driven Processing**: Define reusable `Selection` and `Prompt` templates at the project level. These can be applied to documents to guide automated data extraction or obfuscation workflows.
- **Bulk Operations**: Efficiently upload multiple documents or manage templates in batches.
- **Solid Foundation**: Built on a modern, reliable tech stack for performance and maintainability.

## 🛠️ Tech Stack

Sero stands on the shoulders of giants, using a curated set of modern technologies:

- **Backend**: [Python 3.13+](https://www.python.org/) & [FastAPI](https://fastapi.tiangolo.com/)
- **Database**: [DuckDB](https://duckdb.org/) (for a fast, embedded, and zero-dependency experience)
- **ORM**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (for robust and modern database interaction)
- **Data Validation**: [Pydantic](https://docs.pydantic.dev/)
- **Security**: [Cryptography](https://cryptography.io/) (Fernet symmetric encryption) & [Passlib](https://passlib.readthedocs.io/) (for password hashing)

## 🚀 Getting Started

Ready to get Sero up and running? It's a breeze.

### 1. Prerequisites

Ensure you have **Python 3.13** or higher installed on your system.

### 2. Clone & Setup

First, clone the repository to your local machine:

```sh
git clone <your-repository-url>
cd sero
```

### 3. Install Dependencies

This project uses `uv` for dependency management. It's recommended to create a virtual environment first.

```sh
# Create a virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies using uv
pip install uv
uv pip install -r requirements.txt
```

### 4. Run the Service

Once the dependencies are installed, you can start the service with a single command, thanks to the script entry point defined in `pyproject.toml`:

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

Your Sero instance is now live!

### 5. Explore the API

Navigate to [**http://localhost:8000/docs**](http://localhost:8000/docs) in your browser to access the interactive Swagger UI documentation. You can explore all available endpoints, see the schemas, and even test the API directly from your browser.

## 🤔 How It Works: The Core Concepts

1.  **Create a Project**: Everything starts with a `Project`. You give it a name and a strong password. This password is the key to the kingdom—it's used to derive the encryption key for all documents within that project.
2.  **Upload Documents**: Upload your PDF files to a project. Sero encrypts them on the fly and stores them securely.
3.  **Define Templates (Optional)**: Create `Selection` and `Prompt` templates associated with a project. A `Selection` can define a specific rectangular area on a page (e.g., "the address block"), while a `Prompt` can provide instructions (e.g., "extract the patient's name").
4.  **Process & Obfuscate**: Use the templates to process documents. The service can apply these templates to identify and extract or obfuscate the specified data, creating a new, "obfuscated" version of the file.
5.  **Download Securely**: Download the original or obfuscated files by providing the correct project password to decrypt them.

---

Happy obfuscating!
