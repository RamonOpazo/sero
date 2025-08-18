import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  Upload, 
  Download, 
  Lock,
  Wifi,
  RefreshCw,
  MessageCircle
} from 'lucide-react'

export function TroubleshootingPage() {
  const commonIssues = [
    {
      icon: Upload,
      title: "File Upload Failures",
      category: "Upload Issues",
      severity: "High",
      symptoms: [
        "Upload progress bar gets stuck",
        "Error message: 'Upload failed'",
        "Large files timing out"
      ],
      solutions: [
        "Check your internet connection",
        "Try uploading smaller files (under 50MB)",
        "Clear browser cache and refresh",
        "Disable browser extensions that might interfere",
        "Try a different browser"
      ],
      color: "text-red-600"
    },
    {
      icon: Download,
      title: "File Download Issues",
      category: "Download Issues", 
      severity: "High",
      symptoms: [
        "Downloaded files are corrupted",
        "Download never completes",
        "Password prompts appearing multiple times"
      ],
      solutions: [
        "Verify the file password is correct",
        "Ensure stable internet connection",
        "Try downloading again after a few minutes",
        "Check if popup blocker is preventing download",
        "Contact support if RSA encryption fails"
      ],
      color: "text-red-600"
    },
    {
      icon: Lock,
      title: "Password/Authentication Problems",
      category: "Security Issues",
      severity: "Medium", 
      symptoms: [
        "Incorrect password errors",
        "RSA encryption failures",
        "Unable to access protected files"
      ],
      solutions: [
        "Double-check password spelling and case",
        "Verify caps lock is not enabled",
        "Try generating a new ephemeral key",
        "Clear browser cache and cookies",
        "Ensure JavaScript is enabled"
      ],
      color: "text-yellow-600"
    },
    {
      icon: Wifi,
      title: "Connection Timeouts", 
      category: "Network Issues",
      severity: "Medium",
      symptoms: [
        "Request timeout errors",
        "Slow loading pages",
        "Intermittent connectivity"
      ],
      solutions: [
        "Check internet connection stability",
        "Try refreshing the page",
        "Switch to a different network if possible",
        "Wait and try again later",
        "Contact your IT department for firewall issues"
      ],
      color: "text-yellow-600"
    },
    {
      icon: RefreshCw,
      title: "Browser Compatibility",
      category: "Browser Issues",
      severity: "Low",
      symptoms: [
        "Features not working in older browsers", 
        "Crypto API not available",
        "UI elements displaying incorrectly"
      ],
      solutions: [
        "Update to the latest browser version",
        "Try Chrome, Firefox, Safari, or Edge",
        "Enable JavaScript in browser settings",
        "Clear browser cache and data",
        "Disable conflicting browser extensions"
      ],
      color: "text-blue-600"
    },
    {
      icon: AlertTriangle,
      title: "Performance Issues",
      category: "Performance",
      severity: "Low", 
      symptoms: [
        "Slow page loading",
        "High CPU usage",
        "Browser becomes unresponsive"
      ],
      solutions: [
        "Close unnecessary browser tabs",
        "Restart your browser",
        "Clear browser cache",
        "Check system resources and close other apps",
        "Try incognito/private browsing mode"
      ],
      color: "text-blue-600"
    }
  ]

  const diagnostics = [
    {
      check: "Browser Compatibility",
      description: "Verify your browser supports modern web features",
      action: "Update browser to latest version"
    },
    {
      check: "JavaScript Enabled", 
      description: "SERO requires JavaScript for encryption and API calls",
      action: "Enable JavaScript in browser settings"
    },
    {
      check: "Network Connectivity",
      description: "Stable internet connection required for file operations", 
      action: "Test connection and try again"
    },
    {
      check: "Local Storage",
      description: "Browser storage used for temporary data and preferences",
      action: "Clear browser data if storage is full"
    }
  ]

  const errorCodes = [
    { code: "ERR_001", description: "Invalid file format", solution: "Upload PDF files only" },
    { code: "ERR_002", description: "File size too large", solution: "Reduce file size to under 50MB" },
    { code: "ERR_003", description: "RSA encryption failed", solution: "Refresh page and get new ephemeral key" },
    { code: "ERR_004", description: "Authentication required", solution: "Check API key and permissions" },
    { code: "ERR_005", description: "Network timeout", solution: "Check connection and retry" },
    { code: "ERR_006", description: "Server overloaded", solution: "Wait and try again in a few minutes" }
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex aspect-square size-16 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/20">
            <AlertTriangle className="size-8 text-amber-600" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight">Troubleshooting</h1>
        
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Common issues, solutions, and diagnostic tools to help you resolve problems with SERO
        </p>
      </div>

      {/* Quick Help */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="size-5" />
            Need Immediate Help?
          </CardTitle>
          <CardDescription>
            If you can't find a solution below, reach out to our support team
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button asChild>
            <a href="mailto:support@sero.example.com">
              Contact Support
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/documentation/getting-started">
              Getting Started Guide
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* System Diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="size-5" />
            System Diagnostics
          </CardTitle>
          <CardDescription>
            Check these basic requirements before troubleshooting specific issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {diagnostics.map((diagnostic, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <div className="font-semibold">{diagnostic.check}</div>
                  <div className="text-sm text-muted-foreground">{diagnostic.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{diagnostic.action}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Common Issues */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Common Issues & Solutions</h2>
        
        <div className="grid gap-6">
          {commonIssues.map((issue, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex aspect-square size-12 items-center justify-center rounded-lg bg-muted">
                      <issue.icon className="size-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{issue.title}</CardTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{issue.category}</Badge>
                        <Badge variant={issue.severity === 'High' ? 'destructive' : issue.severity === 'Medium' ? 'default' : 'secondary'}>
                          {issue.severity} Priority
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <XCircle className="size-4 text-red-600" />
                      Symptoms
                    </h3>
                    <ul className="space-y-1">
                      {issue.symptoms.map((symptom, symptomIndex) => (
                        <li key={symptomIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                          {symptom}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="size-4 text-green-600" />
                      Solutions
                    </h3>
                    <ul className="space-y-1">
                      {issue.solutions.map((solution, solutionIndex) => (
                        <li key={solutionIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                          {solution}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Error Codes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="size-5" />
            Error Code Reference
          </CardTitle>
          <CardDescription>
            Common error codes you might encounter and what they mean
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {errorCodes.map((error, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="font-mono">
                    {error.code}
                  </Badge>
                  <div>
                    <div className="font-medium">{error.description}</div>
                    <div className="text-sm text-muted-foreground">{error.solution}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>Prevention Best Practices</CardTitle>
          <CardDescription>
            Follow these recommendations to avoid common issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">File Management</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Keep file sizes under 50MB for best performance
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Use descriptive filenames without special characters
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Ensure PDFs are text-based, not scanned images
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Browser Setup</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Keep browser updated to latest version
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Enable JavaScript and disable strict blocking
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Clear cache periodically to prevent issues
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex gap-4">
              <Button asChild>
                <Link to="/developer/crypto-test">
                  Test System
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/documentation/getting-started">
                  Getting Started
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Still Need Help */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Still Need Help?</CardTitle>
          <CardDescription>
            If none of these solutions work, we're here to help
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            When contacting support, please include:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Browser name and version</li>
              <li>Operating system</li>
              <li>Error messages or codes</li>
              <li>Steps to reproduce the issue</li>
              <li>File size and type (if relevant)</li>
            </ul>
          </div>
          
          <div className="flex gap-4">
            <Button asChild>
              <a href="mailto:support@sero.example.com">
                Email Support
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://github.com/sero/issues" target="_blank" rel="noopener noreferrer">
                Report Bug
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
