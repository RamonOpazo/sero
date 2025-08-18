import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import { 
  Code, 
  ExternalLink, 
  Key, 
  FileText, 
  Lock, 
  Database,
  Globe,
  Settings
} from 'lucide-react'

export function ApiReferencePage() {
  const endpoints = [
    {
      method: "GET",
      path: "/api/projects",
      description: "Retrieve all projects",
      auth: "Required",
      color: "text-green-600 bg-green-100 dark:bg-green-900/20"
    },
    {
      method: "POST", 
      path: "/api/projects",
      description: "Create a new project",
      auth: "Required",
      color: "text-blue-600 bg-blue-100 dark:bg-blue-900/20"
    },
    {
      method: "GET",
      path: "/api/projects/{id}/documents",
      description: "Get documents in a project",
      auth: "Required", 
      color: "text-green-600 bg-green-100 dark:bg-green-900/20"
    },
    {
      method: "POST",
      path: "/api/files/upload",
      description: "Upload a document file",
      auth: "Required",
      color: "text-blue-600 bg-blue-100 dark:bg-blue-900/20"
    },
    {
      method: "POST",
      path: "/api/files/id/{file_id}/download",
      description: "Securely download a file with RSA encryption",
      auth: "Required + Encrypted Password",
      color: "text-blue-600 bg-blue-100 dark:bg-blue-900/20"
    },
    {
      method: "GET",
      path: "/api/crypto/ephemeral-key",
      description: "Get ephemeral RSA public key for encryption",
      auth: "None",
      color: "text-green-600 bg-green-100 dark:bg-green-900/20"
    }
  ]

  const sections = [
    {
      icon: Key,
      title: "Authentication",
      description: "API key authentication and security",
      content: [
        "Most endpoints require authentication",
        "Use API keys in the Authorization header",
        "Keys are generated per project"
      ]
    },
    {
      icon: Lock,
      title: "Encryption",
      description: "RSA encryption for secure file transfers",
      content: [
        "Ephemeral RSA-2048 keys for each request",
        "Client encrypts passwords using public keys",
        "Perfect forward secrecy guaranteed"
      ]
    },
    {
      icon: FileText,
      title: "File Handling",
      description: "Document upload and download workflows",
      content: [
        "Multipart form uploads supported",
        "PDF files preferred for best results",
        "Secure download with encrypted passwords"
      ]
    },
    {
      icon: Database,
      title: "Data Models",
      description: "JSON schemas for requests and responses",
      content: [
        "Standardized response formats",
        "Error handling with HTTP status codes",
        "Pagination for large datasets"
      ]
    }
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex aspect-square size-16 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/20">
            <Code className="size-8 text-blue-600" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight">API Reference</h1>
        
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Complete REST API documentation for integrating SERO into your applications and workflows
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="size-5" />
              Interactive API Explorer
            </CardTitle>
            <CardDescription>
              Try out API endpoints with Swagger UI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/developer/api-swagger">
                Open Swagger UI
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/20 dark:to-teal-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="size-5" />
              Crypto Testing
            </CardTitle>
            <CardDescription>
              Test RSA encryption and key generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/developer/crypto-test">
                Crypto Test Suite
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Base URL */}
      <Card>
        <CardHeader>
          <CardTitle>Base URL</CardTitle>
          <CardDescription>All API endpoints are relative to the base URL</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg font-mono text-sm">
            <div className="text-muted-foreground mb-1">Production:</div>
            <div className="font-semibold">https://api.sero.example.com</div>
            <div className="text-muted-foreground mt-3 mb-1">Development:</div>
            <div className="font-semibold">http://localhost:8000</div>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">API Endpoints</h2>
        
        <div className="grid gap-4">
          {endpoints.map((endpoint, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Badge className={endpoint.color} variant="secondary">
                      {endpoint.method}
                    </Badge>
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {endpoint.path}
                    </code>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {endpoint.auth}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{endpoint.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Documentation Sections */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Documentation Sections</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section, index) => (
            <Card key={index} className="h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-muted">
                    <section.icon className="size-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.content.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Code Example */}
      <Card>
        <CardHeader>
          <CardTitle>Example Request</CardTitle>
          <CardDescription>
            Sample code for downloading a file with RSA encryption
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm text-slate-100">
              <code>{`// 1. Get ephemeral public key
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
const response = await fetch('/api/files/id/123/download', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-api-key'
  },
  body: JSON.stringify({
    key_id,
    encrypted_password: btoa(String.fromCharCode(...new Uint8Array(encryptedPassword)))
  })
});`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limits & Best Practices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Rate Limits</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• 1000 requests per hour per API key</li>
                <li>• 100 file uploads per day</li>
                <li>• Ephemeral keys: 10 per minute</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Best Practices</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Cache ephemeral keys for short periods</li>
                <li>• Use HTTPS for all requests</li>
                <li>• Handle rate limit responses gracefully</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
