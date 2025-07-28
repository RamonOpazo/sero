"use client"

import * as React from "react"
import {
  CircleSlash2,
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  GalleryVerticalEnd,
  Network,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/views/NavMain"
import { NavApi } from "@/components/views/NavApi"
import { NavUser } from "@/components/views/NavUser"
import { TeamSwitcher } from "@/components/views/TeamSwitcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  user: { name: "example", email: "m@example.com", avatar: "/avatars/shadcn.jpg", },
  teams: [
    {
      name: "SERO",
      logo: CircleSlash2,
      plan: "Evelishly Redacts and Obfuscates",
    },
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
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
        <TeamSwitcher teams={data.teams} />
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
