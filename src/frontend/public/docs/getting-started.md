---
slug: getting-started
title: Getting Started with SERO
date: 2025-08-26T10:01:00.000Z
path: ./getting-started
---

# Getting Started with SERO

This guide will help you get up and running with SERO in just a few minutes.

## What is SERO?

SERO (**SE**curely **R**edacts and **O**rganizes) is a secure document redaction platform that uses AI to identify and redact sensitive information in medical documents while maintaining document utility and ensuring privacy through enterprise-grade encryption.

## Quick Start

### Step 1: Create Your First Project

1. Navigate to the **Projects** section
2. Click **"New Project"**
3. Enter a project name (e.g., "Medical Records Q1")
4. Add an optional description
5. Click **"Create Project"**

Your project is now ready for document uploads.

### Step 2: Upload Documents

1. Open your project
2. Click **"Upload Documents"** or drag and drop files
3. Supported formats: PDF (recommended), DOCX, TXT
4. Maximum file size: 50MB per document
5. Wait for the upload to complete

Documents are encrypted during upload using AES-256 encryption.

### Step 3: AI Redaction

1. Select the uploaded document
2. Click **"Start Redaction"**
3. SERO's AI will analyze the document for:
   - Personal Identifiable Information (PII)
   - Protected Health Information (PHI)
   - Social Security Numbers
   - Phone numbers and addresses
   - Custom sensitive patterns
4. Review the suggested redactions
5. Accept, modify, or reject suggestions as needed

### Step 4: Download Results

1. Once redaction is complete, click **"Download"**
2. Enter your project password when prompted
3. The file is encrypted with RSA-2048 ephemeral keys
4. Download begins automatically

The original document remains secure and unmodified.

## System Requirements

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Other Requirements
- JavaScript enabled
- Stable internet connection
- Modern browser with Web Crypto API support

## Next Steps

- [Working with Projects](./projects.md) - Learn advanced project management
- [Document Management](./documents.md) - Master document workflows
- [Security Overview](./security.md) - Understand SERO's security model

## Need Help?

- Check our [FAQ](./faq.md) for common questions
- Visit [Troubleshooting](./troubleshooting.md) for issues
- Contact support at support@sero.example.com
