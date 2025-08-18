import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import { 
  CircleSlash2, 
  FileText, 
  Shield, 
  Zap, 
  Lock,
  ArrowRight,
  BookOpen,
  SquareTerminal 
} from 'lucide-react'

export function HomePage() {
  const features = [
    {
      icon: Shield,
      title: "Secure Document Redaction",
      description: "Advanced AI-powered redaction to protect sensitive information in medical documents while preserving document integrity."
    },
    {
      icon: Lock,
      title: "End-to-End Encryption",
      description: "RSA-2048 ephemeral key encryption ensures your documents are secure with perfect forward secrecy."
    },
    {
      icon: Zap,
      title: "Intelligent Processing",
      description: "Smart document analysis and redaction suggestions powered by cutting-edge AI technology."
    },
    {
      icon: FileText,
      title: "Document Retrieval",
      description: "Efficient organization and retrieval of processed documents with advanced search capabilities."
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="flex justify-center mb-8">
              <div className="text-purple-500 border-2 border-purple-800 flex aspect-square size-16 items-center justify-center rounded-xl">
                <CircleSlash2 className="size-8" strokeWidth={3} />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Welcome to <span className="text-purple-600">SERO</span>
            </h1>
            
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Securely <strong>Ev</strong>elishly <strong>Re</strong>dacts and <strong>█████████</strong> medical documents. 
              Protect sensitive information while maintaining document utility with enterprise-grade security.
            </p>
            
            <div className="mt-8 flex justify-center gap-4">
              <Badge variant="outline" className="text-sm">
                🔐 RSA-2048 Encryption
              </Badge>
              <Badge variant="outline" className="text-sm">
                🤖 AI-Powered Redaction
              </Badge>
              <Badge variant="outline" className="text-sm">
                📋 Document Management
              </Badge>
            </div>

            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button asChild size="lg" className="px-8">
                <Link to="/projects">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              
              <Button variant="outline" size="lg" asChild>
                <Link to="/documentation">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Documentation
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need for secure document processing
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              SERO combines advanced AI technology with enterprise-grade security to provide 
              a comprehensive solution for medical document redaction and management.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex aspect-square size-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20">
                      <feature.icon className="size-6 text-purple-600" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border-t bg-muted/50 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Create your first project and start processing documents securely.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:gap-8">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <SquareTerminal className="size-8 text-purple-600" />
                  <div>
                    <CardTitle>Create a Project</CardTitle>
                    <CardDescription>
                      Set up a new project to organize and process your documents
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to="/projects">
                    Go to Projects
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <BookOpen className="size-8 text-purple-600" />
                  <div>
                    <CardTitle>Learn More</CardTitle>
                    <CardDescription>
                      Read the documentation to understand SERO's features
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full">
                  <Link to="/documentation/getting-started">
                    Get Started Guide
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
