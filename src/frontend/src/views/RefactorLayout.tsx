import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { RefactorProjectProvider } from '@/context/RefactorProjectProvider';
import { ThemeToggle } from '@/components/shared';
import { Separator } from '@/components/ui/separator';
import { Breadcrumbs } from '@/components/features/breadcrumbs/Breadcrumbs';

interface RefactorLayoutProps {
  children: ReactNode;
}

export function RefactorLayout({ children }: RefactorLayoutProps) {
  return (
    <RefactorProjectProvider>
      <div className="min-h-screen bg-background">
        {/* Header with Breadcrumbs */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container">
            {/* Top row with title and theme toggle */}
            <div className="flex h-14 items-center">
              <div className="flex items-center space-x-4">
                <h1 className="font-bold text-xl">SERO</h1>
                <Separator orientation="vertical" className="h-6" />
                <span className="text-sm text-muted-foreground">Document Processing System</span>
              </div>
              <div className="flex flex-1 items-center justify-end">
                <ThemeToggle />
              </div>
            </div>
            
            {/* Breadcrumb row */}
            <div className="pb-3">
              <Breadcrumbs />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container py-6">
          {children}
        </main>

        {/* Toast Notifications */}
        <Toaster />
      </div>
    </RefactorProjectProvider>
  );
}
