import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import {
  Lock,
  ArrowRight,
  BookOpen,
  Bot,
  FileCheck2
} from 'lucide-react'

export function HomePage() {

  return (
    <div className="relative min-h-screen">
      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-6 pt-24 sm:pt-32 lg:px-8">
        <div className="flex flex-col gap-4 w-[50%]">
          {/* Left: Messaging */}
          <div className="text-center lg:text-left max-w-2xl mx-auto">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
              Welcome to <span className="text-purple-600">SERO</span>
            </h1>


            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              <strong className="text-purple-600">SERO</strong> <em className="text-foreground">Evelishly Redacts and Obfuscates</em> sensitive data from medical records, allowing users to maintain compliance to data protection laws, protect privacy of patients and providers, and keep documents usable with enterprise-grade security.
            </p>


            <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-4">
              <Badge variant="outline" className="text-sm">
                <FileCheck2 className="mr-1 h-4 w-4" /> Document Manager
              </Badge>
              <Badge variant="outline" className="text-sm">
                <Bot className="mr-1 h-4 w-4" /> AI-Powered Redaction
              </Badge>
              <Badge variant="outline" className="text-sm">
                <Lock className="mr-1 h-4 w-4" /> RSA-2048 Encryption
              </Badge>
            </div>


            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button asChild size="lg" className="px-8">
                <Link to="/documentation/getting-started">
                  Getting Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/documentation">
                  <BookOpen className="mr-2 h-4 w-4" /> Documentation
                </Link>
              </Button>
            </div>
          </div>

          <h2>How SERO Works</h2>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            SERO allows healthcare professionals to redact patient information
            with precision. Choose between manual redaction for full control,
            or AI-powered redaction for speed and efficiency.
          </p>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            With industry-standard encryption and simple document workflows,
            SERO ensures data remains private and compliant while still useful
            for research and operations.
          </p>

          <h3>Learn More</h3>
          <ul>
            <li>
              <Link to="/documentation/getting-started">Getting Started</Link>
            </li>
            <li>
              <Link to="/documentation/security-model">Security Model</Link>
            </li>
            <li>
              <Link to="/documentation/redaction-pipeline">The Redaction Pipeline</Link>
            </li>
            <li>
              <Link to="/documentation/integration">Integration Guide</Link>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
