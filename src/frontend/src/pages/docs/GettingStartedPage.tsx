import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import { 
  Play, 
  ArrowRight, 
  CheckCircle, 
  Upload, 
  Shield, 
  Download,
  FolderPlus,
  FileText,
  Eye
} from 'lucide-react'

export function GettingStartedPage() {
  const steps = [
    {
      icon: FolderPlus,
      title: "Create a Project",
      description: "Start by creating a new project to organize your documents",
      details: [
        "Click 'New Project' in the Projects view",
        "Enter a project name and description",
        "Your project is ready for document uploads"
      ]
    },
    {
      icon: Upload,
      title: "Upload Documents",
      description: "Upload your medical documents for secure redaction",
      details: [
        "Drag and drop PDF files into your project",
        "Documents are encrypted during upload",
        "Multiple file formats supported"
      ]
    },
    {
      icon: Shield,
      title: "AI Redaction",
      description: "Let SERO's AI identify and redact sensitive information",
      details: [
        "AI analyzes documents for PII and PHI",
        "Review suggested redactions",
        "Customize redaction rules as needed"
      ]
    },
    {
      icon: Download,
      title: "Download Results",
      description: "Securely download your redacted documents",
      details: [
        "Download redacted PDFs with RSA encryption",
        "Original documents remain secure",
        "Audit trail tracks all access"
      ]
    }
  ]

  const features = [
    { icon: Shield, text: "End-to-end encryption" },
    { icon: Eye, text: "AI-powered redaction" },
    { icon: FileText, text: "Document management" },
    { icon: CheckCircle, text: "Compliance ready" }
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex aspect-square size-16 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/20">
            <Play className="size-8 text-green-600" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight">Getting Started</h1>
        
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Learn how to use SERO to securely redact your medical documents in just a few simple steps
        </p>

        <div className="flex justify-center gap-2 flex-wrap">
          {features.map((feature, index) => (
            <Badge key={index} variant="outline" className="text-sm">
              <feature.icon className="size-3 mr-1" />
              {feature.text}
            </Badge>
          ))}
        </div>
      </div>

      {/* Quick Start */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <CheckCircle className="size-5" />
            Quick Start (5 minutes)
          </CardTitle>
          <CardDescription>
            Ready to try SERO? Create your first project and upload a document right now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg">
            <Link to="/projects">
              Create Your First Project
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Step-by-Step Guide */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Step-by-Step Guide</h2>
        
        <div className="grid gap-6">
          {steps.map((step, index) => (
            <Card key={index} className="relative">
              <div className="absolute -left-4 top-8 flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                {index + 1}
              </div>
              <CardHeader className="pl-8">
                <div className="flex items-center gap-3">
                  <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-muted">
                    <step.icon className="size-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{step.title}</CardTitle>
                    <CardDescription className="text-base">{step.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-8">
                <ul className="space-y-2">
                  {step.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Prerequisites */}
      <Card>
        <CardHeader>
          <CardTitle>Prerequisites</CardTitle>
          <CardDescription>
            What you need before getting started with SERO
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">System Requirements</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Modern web browser (Chrome, Firefox, Safari, Edge)</li>
                <li>• Internet connection for secure key exchange</li>
                <li>• JavaScript enabled</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Document Requirements</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• PDF documents (preferred)</li>
                <li>• Maximum file size: 50MB per document</li>
                <li>• Text-based documents work best</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
          <CardDescription>
            Continue learning about SERO's advanced features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" asChild className="h-auto p-4 flex-col items-start">
              <Link to="/documentation/security">
                <Shield className="size-5 mb-2" />
                <div className="text-left">
                  <div className="font-semibold">Security Guide</div>
                  <div className="text-xs text-muted-foreground mt-1">Learn about encryption and privacy</div>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="h-auto p-4 flex-col items-start">
              <Link to="/documentation/api-reference">
                <FileText className="size-5 mb-2" />
                <div className="text-left">
                  <div className="font-semibold">API Reference</div>
                  <div className="text-xs text-muted-foreground mt-1">Integrate SERO with your systems</div>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="h-auto p-4 flex-col items-start">
              <Link to="/documentation/troubleshooting">
                <CheckCircle className="size-5 mb-2" />
                <div className="text-left">
                  <div className="font-semibold">Troubleshooting</div>
                  <div className="text-xs text-muted-foreground mt-1">Common issues and solutions</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
