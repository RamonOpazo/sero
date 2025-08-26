import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Link } from 'react-router-dom'
import {
  Lock,
  ArrowRight,
  BookOpen,
  Bot,
  FileCheck2
} from 'lucide-react'
import { Logo } from '@/components/shared/logo'
import {
  TypographyTitle,
  TypographyLead,
} from '@/components/typography'

export function HomePage() {

  return (
    <div className="relative py-[2rem] px-[3rem]">
      <ScrollArea>
        <div className="max-w-[85ch] flex flex-col gap-8">
          <TypographyTitle>
            Welcome to <Logo variant='full' interactive/>
          </TypographyTitle>

          <div className="mt-2 hidden lg:flex flex-wrap gap-4">
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

          <TypographyLead>
            {/* <Logo variant='full' interactive/> <em className="text-foreground">Evelishly Redacts and Obfuscates</em> sensitive data from medical records, allowing users to maintain compliance to data protection laws, protect privacy of patients and providers, and keep documents usable with enterprise-grade security. */}
            <em className="text-foreground">SERO  <span className="text-muted-foreground">(/ˈsɛ.ɾo/)</span> Evelishly Redacts and Obfuscates</em> sensitive data from medical records, allowing users to maintain compliance to data protection laws, protect privacy of patients and providers, and keep documents usable with enterprise-grade security.
          </TypographyLead>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" className="px-8">
              <Link to="/projects">
                Start a Project
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/documentation">
                <BookOpen className="mr-2 h-4 w-4" /> Read the Docs
              </Link>
            </Button>
          </div>

          <div className="flex flex-col justify-center lg:justify-start gap-2">
            <h2 className="mt-4">How does SERO works?</h2>
            <p className="text-muted-foreground">
              SERO allows healthcare professionals to redact patient information
              with precision. Choose between manual redaction for full control,
              AI-powered redaction for speed and efficiency, or combine both
              approaches for maximum security.
            </p>
            <p className="text-muted-foreground">
              With industry-standard encryption and simple document workflows,
              SERO ensures data remains private and compliant while still useful
              for research and operations.
            </p>

            <h2 className="mt-4">Do you want to learn more?</h2>
            <p className="text-muted-foreground">
              Explore the documentation to understand how to securely protect sensitive
              information and integrate the SERO workflow to your own:
            </p>

            <ul className="list-disc ml-6 space-y-2 text-muted-foreground">
              <li>
                Start with <Link to="/documentation/getting-started" className="text-primary hover:underline">Getting Started</Link> to set up your first redaction project.
              </li>
              <li>
                Read about the <Link to="/documentation/security-model" className="text-primary hover:underline">Security Model</Link>, SERO's cryptographic backbone.
              </li>
              <li>
                Dive into the <Link to="/documentation/redaction-workflow" className="text-primary hover:underline">Redaction Workflow</Link> for an overview on how documents are processed step by step.
              </li>
            </ul>
          </div>
        </div>

      </ScrollArea>
    </div>
  );
}
