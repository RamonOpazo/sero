import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { ProjectProvider } from '@/context/ProjectProvider';
import { ThemeToggle } from '@/components/shared';
import { Separator } from '@/components/ui/separator';
import { Breadcrumbs } from '@/components/features/breadcrumbs/Breadcrumbs';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';

interface LayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: LayoutProps) {
  return (
    <ProjectProvider>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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
      <Toaster />
    </SidebarProvider>
    </ProjectProvider>
  )
}