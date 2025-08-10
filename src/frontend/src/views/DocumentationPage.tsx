import { Link } from 'react-router-dom'

export function DocumentationPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">SERO Documentation</h1>
          <p className="text-muted-foreground text-lg">
            Complete guide to using SERO for secure document redaction and management.
          </p>
        </div>

        <div className="grid gap-6">
          <section>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Getting Started</h2>
            <div className="space-y-3">
              <div>
                <Link 
                  to="/documentation/getting-started" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Getting Started Guide
                </Link>
                <p className="text-sm text-muted-foreground mt-1">
                  Learn the basics of SERO, from installation to your first document redaction.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">User Guide</h2>
            <div className="space-y-3">
              <div>
                <Link 
                  to="/documentation/projects" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Working with Projects
                </Link>
                <p className="text-sm text-muted-foreground mt-1">
                  How to create, manage, and organize your redaction projects.
                </p>
              </div>
              <div>
                <Link 
                  to="/documentation/documents" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Document Management
                </Link>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload, process, and download documents with secure redaction.
                </p>
              </div>
              <div>
                <Link 
                  to="/documentation/redaction" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Redaction Process
                </Link>
                <p className="text-sm text-muted-foreground mt-1">
                  Understanding AI-powered redaction and customizing redaction rules.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Security</h2>
            <div className="space-y-3">
              <div>
                <Link 
                  to="/documentation/security" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Security Overview
                </Link>
                <p className="text-sm text-muted-foreground mt-1">
                  Understanding SERO's security architecture, encryption, and privacy protections.
                </p>
              </div>
              <div>
                <Link 
                  to="/documentation/encryption" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Encryption Details
                </Link>
                <p className="text-sm text-muted-foreground mt-1">
                  Technical details about RSA encryption, ephemeral keys, and secure file transfers.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">API Reference</h2>
            <div className="space-y-3">
              <div>
                <Link 
                  to="/documentation/api-reference" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  API Reference
                </Link>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete REST API documentation for integrating SERO into your applications.
                </p>
              </div>
              <div>
                <Link 
                  to="/documentation/authentication" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Authentication
                </Link>
                <p className="text-sm text-muted-foreground mt-1">
                  API key management, authentication methods, and security best practices.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Support</h2>
            <div className="space-y-3">
              <div>
                <Link 
                  to="/documentation/troubleshooting" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Troubleshooting
                </Link>
                <p className="text-sm text-muted-foreground mt-1">
                  Common issues, error codes, and solutions for SERO users.
                </p>
              </div>
              <div>
                <Link 
                  to="/documentation/faq" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  FAQ
                </Link>
                <p className="text-sm text-muted-foreground mt-1">
                  Frequently asked questions about SERO's features and functionality.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
