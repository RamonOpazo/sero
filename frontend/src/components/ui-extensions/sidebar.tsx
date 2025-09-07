import React from 'react'
import { 
  SidebarProvider as OriginalSidebarProvider,
  Sidebar as OriginalSidebar,
  SidebarInset as OriginalSidebarInset,
  useSidebar as originalUseSidebar
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import './ui-extensions.css'

// Create enhanced contexts for grid layout
const SidebarLayoutContext = React.createContext<{ layout?: string }>({ layout: undefined })
const GridSidebarStateContext = React.createContext<{ state?: 'expanded' | 'collapsed' }>({ state: undefined })

// Custom useSidebar hook that can be overridden based on layout
export function useSidebar() {
  const { layout } = React.useContext(SidebarLayoutContext)
  const originalContext = originalUseSidebar()
  
  if (layout === 'grid') {
    // For grid layout, return the enhanced context
    return originalContext
  }
  
  return originalContext
}

// Comprehensive Grid SidebarProvider that manages its own state and DOM
function GridSidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  children,
  ...props
}: React.ComponentProps<typeof OriginalSidebarProvider> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  const open = openProp ?? internalOpen
  const setOpen = setOpenProp ?? setInternalOpen
  const state = open ? 'expanded' : 'collapsed'
  
  // Create a wrapper div that will have our grid classes and state
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  
  // Update the wrapper's data-state when state changes
  React.useEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.setAttribute('data-state', state)
    }
  }, [state])
  
  return (
    <SidebarLayoutContext.Provider value={{ layout: 'grid' }}>
      <GridSidebarStateContext.Provider value={{ state }}>
        <OriginalSidebarProvider 
          open={open}
          onOpenChange={setOpen}
          defaultOpen={defaultOpen}
          {...props}
        >
          <div 
            ref={wrapperRef}
            className={cn('uix-sidebar-grid-provider', className)}
            data-state={state}
          >
            {children}
          </div>
        </OriginalSidebarProvider>
      </GridSidebarStateContext.Provider>
    </SidebarLayoutContext.Provider>
  )
}

// Grid-specific Sidebar that uses the original but styled for grid
function GridSidebar(props: React.ComponentProps<typeof OriginalSidebar>) {
  return (
    <div className="uix-sidebar-grid-child">
      <OriginalSidebar {...props} />
    </div>
  )
}

// Grid-specific SidebarInset
function GridSidebarInset({ className, ...restProps }: React.ComponentProps<typeof OriginalSidebarInset>) {
  return (
    <main
      className={cn('uix-sidebar-grid-inset', className)}
      data-slot="sidebar-inset"
      {...restProps}
    />
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
