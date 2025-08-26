import * as React from "react"
import { BookOpen, Home, SquareTerminal, Settings, Code } from "lucide-react"
import { AppNavigation, UserMenu } from "@/components/layout/navigation"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail, SidebarMenu, SidebarMenuItem, useSidebar } from "@/components/ui-extensions/sidebar"
import { Logo } from "@/components/shared"
import { cn } from "@/lib/utils"
import { getDocs } from "@/utils/markdown"

// Helper to determine if we're in development mode
const isDev = (typeof window !== 'undefined' && window.location.hostname === 'localhost') ||
  (process.env.NODE_ENV === 'development');

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar()
  const [docItems, setDocItems] = React.useState<any[]>([])

  React.useEffect(() => {
    async function fetchDocItems() {
      const docs = await getDocs()
      const items = docs
        .filter(doc => doc.slug !== 'index' && doc.slug !== 'whats-sero')
        .map(doc => ({ title: doc.title, url: `/docs/${doc.slug}` }))
      setDocItems(items)
    }
    fetchDocItems()
  }, [])

  const data = {
    user: { name: "example", email: "m@example.com", avatar: "/avatars/shadcn.jpg", },
    navMain: [
      {
        title: "Home",
        url: "/",
        icon: Home,
        isActive: false,
      },
      {
        title: "Projects",
        url: "/projects",
        icon: SquareTerminal,
        isActive: true,
      },
      {
        title: "Documentation",
        url: "/docs",
        icon: BookOpen,
        items: [
          { title: "What's Sero", url: "/docs/whats-sero" },
          ...docItems,
        ],
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
        isActive: false,
      },
    ],
    // Developer section - only visible in development
    navDev: isDev ? [
      {
        title: "Developer",
        url: "/dev",
        icon: Code,
        items: [
          { title: "API Swagger", url: "/dev/api-swagger" },
          { title: "Crypto Test", url: "/dev/crypto-test" },
          { title: "DataTable V2", url: "/dev/data-table-v2" },
        ],
      },
    ] : [],
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div
              className={cn(
                "p-2 text-2xl transition delay-200",
                state === "collapsed" && "p-0 size-8 text-center rounded-md"
              )}>
              <Logo variant={state === "collapsed" ? "icon" : "full"} interactive/>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <AppNavigation items={data.navMain} />
        {data.navDev.length > 0 && (
          <AppNavigation items={data.navDev} />
        )}
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
