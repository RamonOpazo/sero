import React from 'react'
import { 
  SidebarProvider as OriginalSidebarProvider,
  Sidebar as OriginalSidebar,
  SidebarInset as OriginalSidebarInset,
  useSidebar as originalUseSidebar
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import './ui-extensions.css'

// Create a context to override the layout variant behavior
const SidebarLayoutContext = React.createContext<{ layout?: string }>({ layout: undefined })

// Custom useSidebar hook that can be overridden based on layout
export function useSidebar() {
  const { layout } = React.useContext(SidebarLayoutContext)
  const originalContext = originalUseSidebar()
  
  if (layout === 'grid') {
    // For grid layout, we might need to override some behaviors
    // For now, return the original context but we could customize it
    return {
      ...originalContext,
      // Override specific behaviors for grid layout if needed
      // For example, different toggle behavior, etc.
    }
  }
  
  return originalContext
}

// Grid-specific SidebarProvider - use original but with grid classes and layout context
function GridSidebarProvider(props: React.ComponentProps<typeof OriginalSidebarProvider>) {
  const { className, ...restProps } = props
  
  return (
    <SidebarLayoutContext.Provider value={{ layout: 'grid' }}>
      <OriginalSidebarProvider 
        className={cn(
          'uix-sidebar-grid-provider',
          // Force grid layout with !important via CSS
          className
        )}
        {...restProps}
      />
    </SidebarLayoutContext.Provider>
  )
}

// Grid-specific Sidebar that bypasses the complex structure
function GridSidebar(props: React.ComponentProps<typeof OriginalSidebar>) {
  const { className, children, ...restProps } = props
  
  return (
    <div 
      className={cn(
        'uix-sidebar-grid-child',
        'bg-sidebar text-sidebar-foreground',
        'flex flex-col h-screen overflow-hidden',
        className
      )}
      data-slot="sidebar"
      {...restProps}
    >
      {children}
    </div>
  )
}

// Grid-specific SidebarInset
function GridSidebarInset(props: React.ComponentProps<typeof OriginalSidebarInset>) {
  const { className, children, ...restProps } = props
  
  return (
    <main
      className={cn(
        'uix-sidebar-grid-inset',
        'bg-background relative flex w-full h-full flex-col overflow-hidden',
        className
      )}
      data-slot="sidebar-inset"
      {...restProps}
    >
      {children}
    </main>
  )
}

// Smart components that choose the right implementation based on layout
function SmartSidebarProvider(props: any) {
  const { layout, ...restProps } = props
  if (layout === 'grid') {
    return <GridSidebarProvider {...restProps} />
  }
  return <OriginalSidebarProvider {...restProps} />
}

function SmartSidebar(props: any) {
  const { layout, ...restProps } = props
  if (layout === 'grid') {
    return <GridSidebar {...restProps} />
  }
  return <OriginalSidebar {...restProps} />
}

function SmartSidebarInset(props: any) {
  const { layout, ...restProps } = props
  if (layout === 'grid') {
    return <GridSidebarInset {...restProps} />
  }
  return <OriginalSidebarInset {...restProps} />
}

// Export the smart components
export const SidebarProvider = SmartSidebarProvider
export const Sidebar = SmartSidebar  
export const SidebarInset = SmartSidebarInset

// Re-export all other sidebar components unchanged (except useSidebar which we override)
export {
  SidebarTrigger,
  SidebarRail,
  SidebarInput,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar'

// Export our custom useSidebar hook
// (already exported above as a named export)
