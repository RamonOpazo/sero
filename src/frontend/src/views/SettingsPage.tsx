import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Link } from 'react-router-dom'
import { 
  Settings, 
  User, 
  Shield, 
  Palette, 
  Bell,
  Database,
  Trash2,
  Download,
  Upload,
  Key
} from 'lucide-react'

export function SettingsPage() {
  const settingsSections = [
    {
      icon: User,
      title: "Profile",
      description: "Manage your account and personal information",
      settings: [
        { label: "Display Name", type: "text", value: "User", description: "How your name appears in the app" },
        { label: "Email", type: "email", value: "user@example.com", description: "Used for notifications and account recovery" },
        { label: "Time Zone", type: "select", value: "UTC", description: "Sets the timezone for timestamps" }
      ]
    },
    {
      icon: Shield,
      title: "Security",
      description: "Configure security settings and encryption preferences",
      settings: [
        { label: "Two-Factor Authentication", type: "switch", value: false, description: "Add an extra layer of security" },
        { label: "Auto-logout", type: "select", value: "1h", description: "Automatically log out after inactivity" },
        { label: "RSA Key Size", type: "select", value: "2048", description: "Encryption strength for file operations" }
      ]
    },
    {
      icon: Palette,
      title: "Appearance",
      description: "Customize the look and feel of the application",
      settings: [
        { label: "Theme", type: "select", value: "system", description: "Choose between light, dark, or system theme" },
        { label: "Sidebar Collapsed", type: "switch", value: false, description: "Start with sidebar collapsed" },
        { label: "Dense Mode", type: "switch", value: false, description: "Show more content in less space" }
      ]
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Control when and how you receive notifications",
      settings: [
        { label: "Upload Notifications", type: "switch", value: true, description: "Notify when uploads complete" },
        { label: "Download Notifications", type: "switch", value: true, description: "Notify when downloads finish" },
        { label: "Error Notifications", type: "switch", value: true, description: "Alert for errors and failures" }
      ]
    },
    {
      icon: Database,
      title: "Data & Storage",
      description: "Manage your data, backups, and storage preferences",
      settings: [
        { label: "Auto-save Projects", type: "switch", value: true, description: "Automatically save project changes" },
        { label: "Cache Duration", type: "select", value: "24h", description: "How long to keep cached data" },
        { label: "Backup Frequency", type: "select", value: "weekly", description: "Automatic backup schedule" }
      ]
    }
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex aspect-square size-16 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900/20">
            <Settings className="size-8 text-slate-600" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
        
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Customize your SERO experience with personal preferences, security options, and application settings
        </p>
      </div>

      {/* Development Notice */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent>
          <div className="flex items-start gap-3">
            <Settings className="size-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">Settings Coming Soon</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                The settings page is currently under development. Most preferences are stored locally and will be implemented in future updates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Sections */}
      <div className="space-y-6">
        {settingsSections.map((section, sectionIndex) => (
          <Card key={sectionIndex}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-muted">
                  <section.icon className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {section.settings.map((setting, settingIndex) => (
                <div key={settingIndex} className="flex items-center justify-between py-2">
                  <div className="space-y-1 flex-1">
                    <Label className="text-sm font-medium">{setting.label}</Label>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                  <div className="ml-6">
                    {setting.type === 'switch' && (
                      <Checkbox 
                        defaultChecked={setting.value as boolean}
                        disabled
                      />
                    )}
                    {setting.type === 'select' && (
                      <Select defaultValue={setting.value as string} disabled>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {setting.label === 'Theme' && (
                            <>
                              <SelectItem value="system">System</SelectItem>
                              <SelectItem value="light">Light</SelectItem>
                              <SelectItem value="dark">Dark</SelectItem>
                            </>
                          )}
                          {setting.label === 'Time Zone' && (
                            <>
                              <SelectItem value="UTC">UTC</SelectItem>
                              <SelectItem value="EST">EST</SelectItem>
                              <SelectItem value="PST">PST</SelectItem>
                            </>
                          )}
                          {setting.label === 'Auto-logout' && (
                            <>
                              <SelectItem value="15m">15 minutes</SelectItem>
                              <SelectItem value="1h">1 hour</SelectItem>
                              <SelectItem value="4h">4 hours</SelectItem>
                              <SelectItem value="never">Never</SelectItem>
                            </>
                          )}
                          {setting.label === 'RSA Key Size' && (
                            <>
                              <SelectItem value="2048">2048-bit</SelectItem>
                              <SelectItem value="3072">3072-bit</SelectItem>
                              <SelectItem value="4096">4096-bit</SelectItem>
                            </>
                          )}
                          {setting.label === 'Cache Duration' && (
                            <>
                              <SelectItem value="1h">1 hour</SelectItem>
                              <SelectItem value="24h">24 hours</SelectItem>
                              <SelectItem value="7d">7 days</SelectItem>
                            </>
                          )}
                          {setting.label === 'Backup Frequency' && (
                            <>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Import, export, and manage your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" disabled className="h-auto p-4 flex-col items-start">
              <Download className="size-5 mb-2" />
              <div className="text-left">
                <div className="font-semibold">Export Data</div>
                <div className="text-xs text-muted-foreground mt-1">Download all your projects and settings</div>
              </div>
            </Button>
            
            <Button variant="outline" disabled className="h-auto p-4 flex-col items-start">
              <Upload className="size-5 mb-2" />
              <div className="text-left">
                <div className="font-semibold">Import Data</div>
                <div className="text-xs text-muted-foreground mt-1">Restore from a previous backup</div>
              </div>
            </Button>
          </div>
          
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">Clear All Data</div>
                <div className="text-xs text-muted-foreground">Remove all projects, files, and settings</div>
              </div>
              <Button variant="destructive" size="sm" disabled>
                <Trash2 className="size-4 mr-2" />
                Clear Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="size-5" />
            Account Actions
          </CardTitle>
          <CardDescription>
            Advanced account management options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" disabled>
              Reset Password
            </Button>
            <Button variant="outline" disabled>
              Download Account Data
            </Button>
            <Button variant="outline" disabled>
              Generate API Key
            </Button>
            <Button variant="outline" asChild>
              <Link to="/developer/crypto-test">
                Test Encryption
              </Link>
            </Button>
          </div>
          
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">Delete Account</div>
                <div className="text-xs text-muted-foreground">Permanently delete your account and all data</div>
              </div>
              <Button variant="destructive" size="sm" disabled>
                Delete Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Get support or learn more about SERO
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button asChild>
              <Link to="/documentation/getting-started">
                Getting Started
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/documentation/troubleshooting">
                Troubleshooting
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <a href="mailto:support@sero.example.com">
                Contact Support
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
