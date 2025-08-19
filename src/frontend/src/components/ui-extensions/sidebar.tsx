import { 
  SidebarProvider as OriginalSidebarProvider,
  Sidebar as OriginalSidebar,
  SidebarInset as OriginalSidebarInset
} from '@/components/ui/sidebar'
import { extendWithVariants, type VariantConfig } from '@/lib/ui-variant-extender'
import './ui-extensions.css'

// Grid-based SidebarProvider variant that fixes width calculations
const sidebarProviderVariantConfig: VariantConfig = {
  variants: {
    layout: {
      // CSS Grid layout that fixes sticky positioning issues
      grid: 'grid min-h-svh w-full transition-all duration-200 ease-linear grid-cols-[var(--uix-grid-sidebar-cols)] data-[state=collapsed]:grid-cols-[var(--uix-grid-sidebar-cols-collapsed)] max-md:grid-cols-[var(--uix-grid-sidebar-cols-mobile)]'
    }
  }
  // No defaultVariants needed - 'default' is auto-created and preserves original behavior
}

// Grid-based Sidebar variant that uses static positioning instead of fixed
const sidebarVariantConfig: VariantConfig = {
  variants: {
    layout: {
      // Static positioning for grid layout (fixes width calculations)
      grid: 'sticky top-0 h-screen w-full hidden md:flex'
    }
  }
  // No defaultVariants needed - 'default' is auto-created and preserves original behavior
}

// Grid-based SidebarInset variant that doesn't need complex peer calculations
const sidebarInsetVariantConfig: VariantConfig = {
  variants: {
    layout: {
      // Simple layout for grid containers (auto width handling)
      grid: 'bg-background relative flex w-full h-full flex-col overflow-hidden'
    }
  }
  // No defaultVariants needed - 'default' is auto-created and preserves original behavior
}

// Extended components with layout variants
export const SidebarProvider = extendWithVariants(OriginalSidebarProvider, sidebarProviderVariantConfig)
export const Sidebar = extendWithVariants(OriginalSidebar, sidebarVariantConfig)
export const SidebarInset = extendWithVariants(OriginalSidebarInset, sidebarInsetVariantConfig)

// Re-export all other sidebar components unchanged
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
  SidebarMenuSubItem,
  useSidebar
} from '@/components/ui/sidebar'
