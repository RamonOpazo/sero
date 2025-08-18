// Markdown content is now handled by react-markdown
// This utility provides the raw markdown content

// Embedded markdown content (in a real app, this would be loaded from files)
const markdownContent: Record<string, string> = {
  'index': `# SERO Documentation

Welcome to the complete guide to using SERO for secure document redaction and management.

## Getting Started

- [Getting Started Guide](./getting-started) - Learn the basics of SERO, from installation to your first document redaction.

## User Guide

- [Working with Projects](./projects) - How to create, manage, and organize your redaction projects.
- [Document Management](./documents) - Upload, process, and download documents with secure redaction.
- [Redaction Process](./redaction) - Understanding AI-powered redaction and customizing redaction rules.

## Security

- [Security Overview](./security) - Understanding SERO's security architecture, encryption, and privacy protections.
- [Encryption Details](./encryption) - Technical details about RSA encryption, ephemeral keys, and secure file transfers.

## API Reference

- [API Reference](./api-reference) - Complete REST API documentation for integrating SERO into your applications.
- [Authentication](./authentication) - API key management, authentication methods, and security best practices.

## Support

- [Troubleshooting](./troubleshooting) - Common issues, error codes, and solutions for SERO users.
- [FAQ](./faq) - Frequently asked questions about SERO's features and functionality.`,

  'getting-started': `# Getting Started with SERO

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

- [Working with Projects](./projects) - Learn advanced project management
- [Document Management](./documents) - Master document workflows
- [Security Overview](./security) - Understand SERO's security model

## Need Help?

- Check our [FAQ](./faq) for common questions
- Visit [Troubleshooting](./troubleshooting) for issues
- Contact support at support@sero.example.com`,

  'projects': `# Working with Projects

Projects in SERO help you organize and manage your document redaction workflows efficiently.

## Creating Projects

### New Project
1. Click **"New Project"** on the Projects page
2. Enter a descriptive name
3. Add an optional description
4. Set project-specific preferences
5. Click **"Create"**

### Project Settings
- **Name**: Descriptive identifier for your project
- **Description**: Optional details about the project purpose
- **Password Protection**: Secure access to project documents
- **Retention Policy**: How long documents are stored
- **Redaction Rules**: Custom patterns for this project

## Managing Projects

### Project Dashboard
Each project has a dedicated dashboard showing:
- Document count and status
- Recent activity
- Storage usage
- Team members (if applicable)
- Redaction statistics

### Project Actions
- **Open**: Access project documents
- **Edit**: Modify project settings
- **Share**: Invite team members
- **Archive**: Move to archived projects
- **Delete**: Permanently remove project and all documents`,

  'security': `# Security Overview

SERO is built with security as a foundational principle, implementing multiple layers of protection for your sensitive documents.

## Security Architecture

### Encryption at Rest
- **AES-256**: All stored documents are encrypted
- **Unique Keys**: Each document has its own encryption key
- **Secure Storage**: Keys are managed separately from data
- **No Plaintext**: Documents never stored in plaintext

### Encryption in Transit
- **TLS 1.3**: All communications use latest TLS
- **Certificate Pinning**: Prevents man-in-the-middle attacks
- **HSTS Headers**: Forces secure connections
- **Perfect Forward Secrecy**: Session keys are ephemeral

### File Download Security
- **RSA-2048 Ephemeral Keys**: Generated fresh for each download
- **Password Encryption**: Passwords never sent in URLs
- **Key Destruction**: Private keys destroyed immediately after use
- **No Key Reuse**: Each download uses unique key pair

## RSA Encryption Process

1. **Key Generation**: Server generates ephemeral RSA-2048 key pair
2. **Public Key Transfer**: Public key sent to client (private key stays on server)
3. **Client Encryption**: Password encrypted with public key using Web Crypto API
4. **Secure Transmission**: Encrypted password sent in POST body
5. **Server Decryption**: Server decrypts password using private key
6. **Key Destruction**: Private key immediately destroyed, no trace remains`,

  'api-reference': `# API Reference

Complete REST API documentation for integrating SERO into your applications and workflows.

## Base URL

\`\`\`
Production:  https://api.sero.example.com
Development: http://localhost:8000
\`\`\`

## Authentication

All API endpoints except public key retrieval require authentication using API keys:

\`\`\`http
Authorization: Bearer your-api-key-here
\`\`\`

## Endpoints

### Projects

#### Get All Projects
\`\`\`http
GET /api/projects
\`\`\`

**Response:**
\`\`\`json
{
  "projects": [
    {
      "id": "proj_123",
      "name": "Medical Records Q1",
      "description": "Patient records for Q1 2024",
      "created_at": "2024-01-15T10:30:00Z",
      "document_count": 5,
      "status": "active"
    }
  ]
}
\`\`\`

### Files

#### Download File (Secure)
\`\`\`http
POST /api/files/id/{file_id}/download
Content-Type: application/json
\`\`\`

**Request Body:**
\`\`\`json
{
  "key_id": "eph_key_123",
  "encrypted_password": "base64-encoded-encrypted-password"
}
\`\`\`

### Cryptography

#### Get Ephemeral Key
\`\`\`http
GET /api/crypto/ephemeral-key
\`\`\`

**Response:**
\`\`\`json
{
  "key_id": "eph_key_123",
  "public_key": "base64-encoded-public-key",
  "expires_at": "2024-01-15T11:05:00Z"
}
\`\`\``,

  'troubleshooting': `# Troubleshooting

Common issues, solutions, and diagnostic tools to help you resolve problems with SERO.

## Common Issues

### File Upload Failures

**Symptoms:**
- Upload progress bar gets stuck
- Error message: 'Upload failed'
- Large files timing out

**Solutions:**
- Check your internet connection
- Try uploading smaller files (under 50MB)
- Clear browser cache and refresh
- Disable browser extensions that might interfere
- Try a different browser

### File Download Issues

**Symptoms:**
- Downloaded files are corrupted
- Download never completes
- Password prompts appearing multiple times

**Solutions:**
- Verify the file password is correct
- Ensure stable internet connection
- Try downloading again after a few minutes
- Check if popup blocker is preventing download
- Contact support if RSA encryption fails

### Password/Authentication Problems

**Symptoms:**
- Incorrect password errors
- RSA encryption failures
- Unable to access protected files

**Solutions:**
- Double-check password spelling and case
- Verify caps lock is not enabled
- Try generating a new ephemeral key
- Clear browser cache and cookies
- Ensure JavaScript is enabled

## Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| ERR_001 | Invalid file format | Upload PDF files only |
| ERR_002 | File size too large | Reduce file size to under 50MB |
| ERR_003 | RSA encryption failed | Refresh page and get new ephemeral key |
| ERR_004 | Authentication required | Check API key and permissions |
| ERR_005 | Network timeout | Check connection and retry |`,

  'faq': `# Frequently Asked Questions

## General Questions

### What is SERO?
SERO is a secure document redaction platform that uses AI to identify and redact sensitive information in medical documents while maintaining document utility and ensuring privacy through enterprise-grade encryption.

### What file formats are supported?
SERO primarily supports PDF files for optimal results. DOCX and TXT files are also supported but PDF is recommended for best redaction accuracy.

### What is the maximum file size?
The current maximum file size is 50MB per document.

## Security Questions

### How secure is SERO?
SERO uses multiple layers of security including:
- AES-256 encryption for stored documents
- RSA-2048 ephemeral keys for file downloads
- TLS 1.3 for all communications
- Perfect forward secrecy
- No plaintext passwords in URLs or logs

### What happens to my documents?
Your documents are:
- Encrypted immediately upon upload
- Processed securely on our servers
- Never stored in plaintext
- Automatically deleted based on retention policies
- Never shared with third parties

### Can I delete my data?
Yes, you can delete individual documents, entire projects, or request complete account deletion at any time.

## Technical Questions

### Which browsers are supported?
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Do I need to install anything?
No, SERO is a web-based application that runs entirely in your browser. No downloads or installations required.

### Can I use SERO offline?
No, SERO requires an internet connection for AI processing and secure key exchange.`
}

/**
 * Load raw markdown content for a documentation page
 */
export async function loadMarkdownDoc(docName: string): Promise<string> {
  const content = markdownContent[docName]
  if (!content) {
    throw new Error(`Documentation page not found: ${docName}`)
  }

  return content
}

/**
 * Get the title from a documentation page
 */
export function getDocTitle(docName: string): string {
  const titles: Record<string, string> = {
    'index': 'Documentation',
    'getting-started': 'Getting Started',
    'projects': 'Working with Projects',
    'documents': 'Document Management',
    'redaction': 'Redaction Process',
    'security': 'Security Overview',
    'encryption': 'Encryption Details',
    'api-reference': 'API Reference',
    'authentication': 'Authentication',
    'troubleshooting': 'Troubleshooting',
    'faq': 'FAQ'
  }
  
  return titles[docName] || 'Documentation'
}

/**
 * Check if a documentation page exists
 */
export function docExists(docName: string): boolean {
  return docName in markdownContent
}
