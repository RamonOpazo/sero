/**
 * UI Extensions - Extended shadcn/ui components with semantic variants
 * 
 * These components extend the base shadcn/ui components with additional
 * semantic variants using the ui-variant-extender utility.
 * 
 * @example
 * ```tsx
 * import { Badge, Button } from '@/components/ui-extensions'
 * 
 * <Badge semantic="success">Success badge</Badge>
 * <Button semantic="warning">Warning button</Button>
 * ```
 */

// Extended components with semantic variants
export { Badge } from './badge'
export { Button } from './button'

// Sidebar grid layout extensions (smart components that auto-detect grid layout)
export { SidebarProvider, Sidebar, SidebarInset } from './sidebar'
