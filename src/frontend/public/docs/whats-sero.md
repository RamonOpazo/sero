---
slug: whats-sero
title: What is SERO?
date: 2025-08-26T10:00:00.000Z
is-index: true
---

# What is SERO?

SERO is a service for **secure redaction and obfuscation of clinical documents**, with a strong focus on **privacy, automation, and reproducibility**. It provides an opinionated yet flexible framework for handling sensitive data, making it easier to comply with privacy regulations such as HIPAA and GDPR while still enabling collaboration and research.

At its core, SERO is not “just another redaction tool.” It is a **project-based system** built around encryption, isolation, and templates. This design allows you to safely manage large collections of documents and apply consistent redaction strategies across them. Whether you are a hospital preparing patient records for research, a university anonymizing medical datasets, or a compliance team processing sensitive files, SERO helps you do so with confidence.

## Why SERO?

In healthcare and research, the need to share documents often collides with the obligation to protect personal information. Manual redaction is error-prone, inconsistent, and extremely time-consuming. Even small mistakes can lead to privacy breaches with serious consequences.

SERO solves this by automating the process. It encrypts every document by default, isolates work into password-protected projects, and provides a system of reusable templates that guarantee consistent results. This approach reduces human error, accelerates processing, and ensures that sensitive information is never exposed unnecessarily.

## Core Concepts

Understanding SERO starts with a few central ideas:

### Projects
A project is the basic unit of organization in SERO. Each project is protected by a password that never leaves the client and is used to derive encryption keys. Documents, templates, and results stored within a project are completely isolated from other projects. This separation means that datasets for different studies or departments can coexist without any risk of cross-contamination.

### Documents
Documents are the primary assets you process with SERO. When a PDF is uploaded, it is immediately encrypted and stored securely. Decryption only happens at the moment of access, and only if the correct password is provided. Documents can then be processed using templates to redact or obfuscate sensitive information.

### Templates
Templates define how documents should be processed. They come in two forms:
- **Selection templates**, which mark fixed regions on a page (such as patient ID fields or headers).
- **Prompt templates**, which provide instructions for extracting or replacing textual information.

Templates are reusable within a project, ensuring consistent and repeatable redaction across entire datasets.

### Redaction vs Obfuscation
Redaction permanently removes sensitive information (e.g., black boxes over names). Obfuscation replaces sensitive values with neutral or pseudonymized alternatives (e.g., replacing “John Smith” with “Patient A”). SERO supports both, allowing you to choose depending on the context.

## Features at a Glance

- **End-to-end encryption** using keys derived from project passwords.  
- **Project-based isolation** so different datasets remain fully separated.  
- **Reusable templates** for repeatable, error-free redaction workflows.  
- **Bulk document processing** to scale to thousands of files.  
- **Modern RESTful API** with interactive documentation via Swagger.  
- **Lightweight architecture** powered by FastAPI and DuckDB, requiring minimal setup.  

## How It Works

A typical workflow with SERO looks like this:

1. You create a project and set a password, which becomes the encryption key for all its contents.
2. You upload documents, which are encrypted immediately on arrival.
3. You define templates, either by marking selections on pages or by writing prompts that describe what should be anonymized.
4. You apply those templates to one or more documents, producing redacted or obfuscated versions.
5. You download the processed files, which are safe to share because sensitive information has been reliably removed.

This workflow can be scaled from a handful of documents to large batches, and it guarantees that every document is treated consistently.

## Technical Foundation

SERO is built on a security-first, developer-friendly stack:

- **Python 3.13+** as the core language.  
- **FastAPI** for high-performance HTTP services.  
- **DuckDB** as a fast, embedded database with no external dependencies.  
- **SQLAlchemy 2.0** and **Pydantic** for structured data handling.  
- **Cryptography (Fernet)** for symmetric encryption.  
- **Passlib** for secure password hashing.  

This combination makes SERO lightweight enough to run locally, but robust enough for production deployments.

## A Practical Example

Imagine a hospital research team preparing to share discharge summaries with a university. They create a project called `Cohort-2025` and set a strong password. They upload 500 patient PDFs into the project, which are immediately encrypted. They then define a selection template that covers patient names and hospital IDs, and a prompt template that replaces physician names with neutral identifiers. With one command, they apply both templates to the entire set of documents and export anonymized versions. The research team can now share the dataset without risking patient privacy.

## Roadmap and Vision

SERO is designed to grow. Planned features include support for more document formats, role-based access control, integration with cloud storage systems, and advanced obfuscation strategies such as pseudonymization and synthetic replacements. A web-based user interface is also envisioned to make SERO accessible to non-technical users.

The long-term vision is to provide a secure, repeatable, and developer-friendly platform for document anonymization, suitable for both research labs and enterprise compliance teams.

---

In short, SERO brings automation and security to a process that has traditionally been manual and risky. It is both approachable for newcomers and extensible for advanced users, giving you the tools to protect sensitive information without slowing down your work.

