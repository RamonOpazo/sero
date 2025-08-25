# What’s SERO?

Welcome to **Sero** (pronounced /ˈsɛ.ɾo/), short for **E**vilishly **R**edacts and **O**bfuscates—your high-performance service for secure redaction and obfuscation of clinical documents. Sero ensures critical patient and healthcare provider information remains confidential and protected.

## Why Sero?

In healthcare, safeguarding personally identifiable information (PII) within clinical PDFs—such as medical records, lab results, and research documents—is not just best practice; it's a legal and ethical obligation. Sero simplifies this by automating secure redaction workflows, giving you peace of mind when sharing sensitive documents. :contentReference[oaicite:0]{index=0}

## Core Principles & Features

- **Project-Based Isolation**  
  Organize documents into password-protected projects. Each project acts as a secure, isolated environment—ensuring data separation and enhancing security. :contentReference[oaicite:1]{index=1}

- **End-to-End Encryption**  
  Uploaded PDFs are encrypted in real time using a key derived from your project password. Files remain encrypted at rest and are only decrypted when accessed with the correct password. :contentReference[oaicite:2]{index=2}

- **Template-Driven Processing**  
  Create reusable **Selection** (areas on a page) and **Prompt** (instructions guiding extraction or obfuscation) templates at the project level. Apply them to your documents for efficient, repeatable workflows. :contentReference[oaicite:3]{index=3}

- **Bulk Operations**  
  Easily upload multiple documents or templates in batches to streamline workflow and save time. :contentReference[oaicite:4]{index=4}

- **Powerful RESTful API**  
  Interact with Sero through a clean, modern API—complete with interactive documentation via Swagger. :contentReference[oaicite:5]{index=5}

## Technical Foundation

Sero is built with a security-first, performance-driven architecture:

- **Backend:** Python 3.13+ & FastAPI  
- **Database:** DuckDB—fast, embedded, and zero-dependency  
- **ORM:** SQLAlchemy 2.0  
- **Validation:** Pydantic  
- **Security:** Fernet symmetric encryption (via Cryptography library) and secure password hashing (via Passlib) :contentReference[oaicite:6]{index=6}

## Quickstart Overview

1. **Prerequisites**
   - Python 3.13 or above.

2. **Installation**
   ```bash
   git clone <your-repository-url>
   cd sero
   python -m venv .venv
   source .venv/bin/activate
   pip install uv
   uv pip install -r requirements.txt
