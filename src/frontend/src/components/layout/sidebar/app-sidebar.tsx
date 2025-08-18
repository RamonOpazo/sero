"use client"

import * as React from "react"
import {
  CircleSlash2,
  BookOpen,
  Home,
  SquareTerminal,
  Settings,
  Code,
} from "lucide-react"

import { AppNavigation, UserMenu } from "@/components/layout/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// Helper to determine if we're in development mode
const isDev = (typeof window !== 'undefined' && window.location.hostname === 'localhost') || 
              (process.env.NODE_ENV === 'development');

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
      url: "/documentation",
      icon: BookOpen,
      items: [
        { title: "What's Sero", url: "/documentation/whats-sero" },
        { title: "Getting Started", url: "/documentation/getting-started" },
        { title: "Installation", url: "/documentation/installation" },
        { title: "Project Management", url: "/documentation/project-management" },
        { title: "Document Redaction", url: "/documentation/document-redaction" },
        { title: "Document Retrieval", url: "/documentation/document-retrieval" },
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
      ],
    },
  ] : [],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="text-purple-500 border-2 border-purple-800 flex aspect-square size-8 items-center justify-center rounded-lg">
                <CircleSlash2
                  className="size-4"
                  strokeWidth={3}
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold tracking-wider">SERO</span>
                <span className="truncate text-xs text-muted-foreground">Evelishly Redacts and ██████████</span>
              </div>
            </SidebarMenuButton>
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
