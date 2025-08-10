"use client"

import * as React from "react"
import {
  CircleSlash2,
  BookOpen,
  Bot,
  Network,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/views/NavMain"
import { NavApi } from "@/views/NavApi"
import { NavUser } from "@/views/NavUser"
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

const data = {
  user: { name: "example", email: "m@example.com", avatar: "/avatars/shadcn.jpg", },
  navMain: [
    {
      title: "Playground",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        { title: "Dashboard", url: "/", },
        { title: "Projects", url: "/projects", },
        { title: "Settings", url: "#", },
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        { title: "Genesis", url: "#", },
        { title: "Explorer", url: "#", },
        { title: "Quantum", url: "#", },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        { title: "Introduction", url: "#", },
        { title: "Getting Started", url: "#", },
        { title: "Project Structure", url: "#", },
        { title: "Document Redaction", url: "#", },
        { title: "Document Retrieval", url: "#", },
      ],
    },
  ],
  navApi: [
    { name: "Swagger", url: "/docs", icon: Network, },
  ],
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
        <NavMain items={data.navMain} />
        <NavApi projects={data.navApi} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
