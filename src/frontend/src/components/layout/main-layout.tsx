import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { WorkspaceProvider } from '@/providers/workspace-provider';
import { ThemeToggle } from '@/components/shared';
import { Separator } from '@/components/ui/separator';
import { Breadcrumbs } from './navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui-extensions/sidebar';
import { AppSidebar } from './sidebar';

interface LayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: LayoutProps) {
  return (
    <WorkspaceProvider>
      <SidebarProvider layout="grid">
        <AppSidebar layout="grid" />
        <SidebarInset layout="grid">
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex w-full items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumbs />
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
      {/* Move Toaster outside the grid layout to prevent layout shifts */}
      <Toaster />
    </WorkspaceProvider>
  )
}
