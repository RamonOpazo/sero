import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import { 
  Shield, 
  Lock, 
  Key, 
  Eye, 
  CheckCircle, 
  AlertTriangle,
  Server,
  Globe,
  Zap
} from 'lucide-react'

export function SecurityPage() {
  const securityFeatures = [
    {
      icon: Lock,
      title: "RSA-2048 Encryption",
      description: "Industry-standard asymmetric encryption",
      details: [
        "2048-bit RSA keys for maximum security",
        "Perfect forward secrecy with ephemeral keys",
        "Keys are generated fresh for each request",
        "Private keys are destroyed immediately after use"
      ],
      status: "Implemented"
    },
    {
      icon: Key,
      title: "Ephemeral Key Management", 
      description: "Temporary keys that exist only for single operations",
      details: [
        "New key pair generated per download request",
        "Keys expire automatically after 5 minutes",
        "No long-term key storage on servers",
        "Protection against key compromise"
      ],
      status: "Implemented"
    },
    {
      icon: Shield,
      title: "End-to-End Protection",
      description: "Data is protected throughout its entire journey",
      details: [
        "Client-side password encryption",
        "HTTPS/TLS for data in transit",
        "Encrypted storage of sensitive files",
        "No plaintext passwords in logs or URLs"
      ],
      status: "Implemented"
    },
    {
      icon: Eye,
      title: "Privacy-First Design",
      description: "Built with user privacy as the top priority", 
      details: [
        "No tracking or analytics cookies",
        "Minimal data collection policy",
        "User data never shared with third parties",
        "Audit trails for compliance"
      ],
      status: "In Progress"
    }
  ]

  const threatModel = [
    {
      threat: "Password Exposure in URLs",
      mitigation: "RSA-encrypted password in POST body",
      risk: "Eliminated",
      color: "text-green-600"
    },
    {
      threat: "Man-in-the-Middle Attacks",
      mitigation: "HTTPS/TLS + Certificate pinning",
      risk: "Low",
      color: "text-green-600"
    },
    {
      threat: "Server Key Compromise",
      mitigation: "Ephemeral keys with immediate destruction",
      risk: "Mitigated", 
      color: "text-yellow-600"
    },
    {
      threat: "Data Breaches",
      mitigation: "Encrypted storage + Access controls",
      risk: "Low",
      color: "text-green-600"
    },
    {
      threat: "Replay Attacks",
      mitigation: "Unique key IDs + Time-based expiration",
      risk: "Mitigated",
      color: "text-yellow-600"
    }
  ]

  const compliance = [
    { standard: "HIPAA", description: "Health Insurance Portability and Accountability Act", status: "Compliant" },
    { standard: "GDPR", description: "General Data Protection Regulation", status: "Compliant" },
    { standard: "SOC 2", description: "Service Organization Control 2", status: "In Progress" },
    { standard: "FIPS 140-2", description: "Federal Information Processing Standard", status: "Planned" }
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex aspect-square size-16 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/20">
            <Shield className="size-8 text-purple-600" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight">Security</h1>
        
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Understanding SERO's comprehensive security architecture and privacy protections
        </p>

        <div className="flex justify-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-sm">
            <Lock className="size-3 mr-1" />
            RSA-2048
          </Badge>
          <Badge variant="outline" className="text-sm">
            <Shield className="size-3 mr-1" />
            End-to-End
          </Badge>
          <Badge variant="outline" className="text-sm">
            <Key className="size-3 mr-1" />
            Ephemeral Keys
          </Badge>
        </div>
      </div>

      {/* Security Overview */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="size-5" />
            Security at a Glance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">256-bit</div>
              <div className="text-sm text-muted-foreground">AES Encryption</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">2048-bit</div>
              <div className="text-sm text-muted-foreground">RSA Keys</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">5 min</div>
              <div className="text-sm text-muted-foreground">Key Expiration</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Features */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Security Features</h2>
        
        <div className="grid gap-6">
          {securityFeatures.map((feature, index) => (
            <Card key={index} className="relative">
              <div className="absolute top-4 right-4">
                <Badge variant={feature.status === 'Implemented' ? 'default' : 'secondary'}>
                  {feature.status}
                </Badge>
              </div>
              <CardHeader className="pr-24">
                <div className="flex items-center gap-3">
                  <div className="flex aspect-square size-12 items-center justify-center rounded-lg bg-muted">
                    <feature.icon className="size-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feature.details.map((detail, detailIndex) => (
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

      {/* Threat Model */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Threat Model & Mitigations</h2>
        
        <div className="grid gap-4">
          {threatModel.map((item, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div>
                    <div className="font-semibold text-sm mb-1">Threat</div>
                    <div className="text-sm">{item.threat}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="font-semibold text-sm mb-1">Mitigation</div>
                    <div className="text-sm text-muted-foreground">{item.mitigation}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={`${item.color}`}>
                      {item.risk}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="size-5" />
            How RSA Encryption Works in SERO
          </CardTitle>
          <CardDescription>
            Step-by-step breakdown of our secure file download process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex gap-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">1</div>
              <div>
                <div className="font-semibold">Client Request</div>
                <div className="text-sm text-muted-foreground">User requests file download with password</div>
              </div>
            </div>
            
            <div className="flex gap-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">2</div>
              <div>
                <div className="font-semibold">Key Generation</div>
                <div className="text-sm text-muted-foreground">Server generates ephemeral RSA-2048 key pair</div>
              </div>
            </div>
            
            <div className="flex gap-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">3</div>
              <div>
                <div className="font-semibold">Public Key Transfer</div>
                <div className="text-sm text-muted-foreground">Public key sent to client (private key stays on server)</div>
              </div>
            </div>
            
            <div className="flex gap-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">4</div>
              <div>
                <div className="font-semibold">Client Encryption</div>
                <div className="text-sm text-muted-foreground">Password encrypted with public key using Web Crypto API</div>
              </div>
            </div>
            
            <div className="flex gap-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">5</div>
              <div>
                <div className="font-semibold">Secure Download</div>
                <div className="text-sm text-muted-foreground">Encrypted password sent in POST body, file delivered</div>
              </div>
            </div>
            
            <div className="flex gap-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">6</div>
              <div>
                <div className="font-semibold">Key Destruction</div>
                <div className="text-sm text-muted-foreground">Private key immediately destroyed, no trace remains</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-5" />
            Compliance Standards
          </CardTitle>
          <CardDescription>
            SERO's compliance with industry standards and regulations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {compliance.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <div className="font-semibold">{item.standard}</div>
                  <div className="text-sm text-muted-foreground">{item.description}</div>
                </div>
                <Badge variant={item.status === 'Compliant' ? 'default' : 'secondary'}>
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5" />
            Security Best Practices
          </CardTitle>
          <CardDescription>
            Recommendations for keeping your data secure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">For Users</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Use strong, unique passwords for each project
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Enable two-factor authentication when available
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Regularly review and delete unused projects
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Keep your browser up to date
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">For Developers</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Always use HTTPS for API requests
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Validate certificates and implement pinning
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Never cache or log encrypted passwords
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Implement proper error handling
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex gap-4">
              <Button asChild>
                <Link to="/developer/crypto-test">
                  Test Encryption
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/documentation/api-reference">
                  API Security Guide
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
