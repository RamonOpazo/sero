import type { ReactNode } from 'react'
// import { useLocation, Link } from 'react-router-dom'
// import { Home, Settings } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { SettingsToggle } from '@/components/SettingsToggle'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Toaster } from '@/components/ui/sonner'
// import { cn } from '@/lib/utils'

interface LayoutProps {
  children: ReactNode
}

// const navigation = [
//   { name: 'Projects', href: '/', icon: Home },
//   { name: 'Settings', href: '#', icon: Settings },
// ]

export function Layout({ children }: LayoutProps) {
  // const location = useLocation()

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-background">
      {/* Sidebar - Fixed width */}
      {/* <aside className="w-64 flex-shrink-0 border-r bg-muted/10 flex flex-col"> */}
        {/* Logo/Header */}
        {/* <div className="flex h-14 items-center justify-between border-b px-4 flex-shrink-0">
          <h1 className="text-xl font-semibold">SERO</h1>
          <ThemeToggle />
        </div> */}

        {/* Navigation */}
        {/* <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav> */}

        {/* Footer/User section */}
        {/* <div className="border-t p-4 flex-shrink-0">
          <div className="flex items-center gap-3 text-sm">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Settings className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium">Settings</p>
              <p className="text-muted-foreground text-xs">Configure app</p>
            </div>
          </div>
        </div>
      </aside> */}

      {/* Right Area with Navigation Bar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navigation Bar with Breadcrumbs - Same height as SERO logo section */}
        <div className="h-14 flex-shrink-0 border-b bg-background flex items-center px-6">
          <h1 className="text-xl font-semibold pr-5">SERO //</h1>
          <Breadcrumbs />
          <div className="flex-1 text-right">
            <ThemeToggle />
            <SettingsToggle />
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  )
}
