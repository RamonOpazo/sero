---
slug: api-reference
title: API Reference
date: 2025-08-26T10:02:00.000Z
path: ./api-reference
---

# API Reference

Complete REST API documentation for integrating SERO into your applications and workflows.

## Base URL

```
Production:  https://api.sero.example.com
Development: http://localhost:8000
```

## Authentication

All API endpoints except public key retrieval require authentication using API keys:

```http
Authorization: Bearer your-api-key-here
```

API keys can be generated from the [Settings](../settings) page or through the API key management endpoint.

## Rate Limits

| Resource | Limit |
|----------|-------|
| General API calls | 1000 requests/hour |
| File uploads | 100 uploads/day |
| Ephemeral key generation | 10 requests/minute |

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Request limit per time window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

## Endpoints

### Projects

#### Get All Projects
```http
GET /api/projects
```

**Response:**
```json
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
```

#### Create Project
```http
POST /api/projects
```

**Request Body:**
```json
{
  "name": "New Project",
  "description": "Project description",
  "password": "secure-password"
}
```

#### Get Project Documents
```http
GET /api/projects/{project_id}/documents
```

**Response:**
```json
{
  "documents": [
    {
      "id": "doc_456",
      "filename": "patient_record.pdf",
      "size": 1048576,
      "status": "processed",
      "uploaded_at": "2024-01-15T11:00:00Z",
      "redaction_status": "completed"
    }
  ]
}
```

### Files

#### Upload File
```http
POST /api/files/upload
Content-Type: multipart/form-data
```

**Request:**
```
file: [file data]
project_id: proj_123
```

**Response:**
```json
{
  "file_id": "file_789",
  "filename": "document.pdf",
  "size": 1048576,
  "status": "uploaded"
}
```

#### Download File (Secure)
```http
POST /api/files/id/{file_id}/download
Content-Type: application/json
```

**Request Body:**
```json
{
  "key_id": "eph_key_123",
  "encrypted_password": "base64-encoded-encrypted-password"
}
```

**Response:**
- Binary file data with appropriate `Content-Type` header
- `Content-Disposition: attachment; filename="document.pdf"`

### Cryptography

#### Get Ephemeral Key
```http
GET /api/crypto/ephemeral-key
```

**Response:**
```json
{
  "key_id": "eph_key_123",
  "public_key": "base64-encoded-public-key",
  "expires_at": "2024-01-15T11:05:00Z"
}
```

## Error Handling

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "INVALID_FILE_FORMAT",
    "message": "Only PDF files are supported",
    "details": {
      "supported_formats": ["pdf", "docx", "txt"]
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is missing or invalid |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource does not exist |
| `INVALID_FILE_FORMAT` | 400 | Unsupported file format |
| `FILE_TOO_LARGE` | 413 | File exceeds maximum size limit |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `ENCRYPTION_FAILED` | 400 | RSA encryption/decryption failed |
| `INVALID_PASSWORD` | 400 | Project password is incorrect |

## Example Implementations

### JavaScript (Secure File Download)

```javascript
async function downloadFileSecurely(fileId, password) {
  // 1. Get ephemeral public key
  const keyResponse = await fetch('/api/crypto/ephemeral-key');
  const { key_id, public_key } = await keyResponse.json();
  
  // 2. Import the public key
  const publicKey = await crypto.subtle.importKey(
    'spki',
    new Uint8Array(atob(public_key).split('').map(c => c.charCodeAt(0))),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );
  
  // 3. Encrypt password
  const passwordBytes = new TextEncoder().encode(password);
  const encryptedPassword = await crypto.subtle.encrypt(
    'RSA-OAEP',
    publicKey,
    passwordBytes
  );
  
  // 4. Download file
  const response = await fetch(`/api/files/id/${fileId}/download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your-api-key'
    },
    body: JSON.stringify({
      key_id,
      encrypted_password: btoa(String.fromCharCode(...new Uint8Array(encryptedPassword)))
    })
  });
  
  if (response.ok) {
    const blob = await response.blob();
    // Handle file download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

### Python (Project Management)

```python
import requests

class SeroClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def create_project(self, name, description, password):
        response = requests.post(
            f'{self.base_url}/api/projects',
            headers=self.headers,
            json={
                'name': name,
                'description': description,
                'password': password
            }
        )
        return response.json()
    
    def list_projects(self):
        response = requests.get(
            f'{self.base_url}/api/projects',
            headers=self.headers
        )
        return response.json()

# Usage
client = SeroClient('https://api.sero.example.com', 'your-api-key')
project = client.create_project('Test Project', 'Description', 'password')
```

## SDKs and Libraries

Official SDKs are available for:
- **JavaScript/TypeScript**: `npm install @sero/sdk-js`
- **Python**: `pip install sero-sdk`
- **Go**: `go get github.com/sero/sdk-go`
- **PHP**: `composer require sero/sdk-php`

## Webhooks

SERO can send webhooks for important events:

### Supported Events
- `document.uploaded`
- `document.processed`
- `project.created`
- `project.shared`

### Webhook Payload
```json
{
  "event": "document.processed",
  "timestamp": "2024-01-15T11:30:00Z",
  "data": {
    "document_id": "doc_456",
    "project_id": "proj_123",
    "status": "completed",
    "redactions_found": 12
  }
}
```

## Next Steps

- [Authentication](./authentication.md) - Detailed authentication methods
- [Security Overview](./security.md) - API security considerations
- [Troubleshooting](./troubleshooting.md) - API-related issues
