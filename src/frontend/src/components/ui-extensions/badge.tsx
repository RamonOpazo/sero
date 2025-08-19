import { Badge as OriginalBadge } from '@/components/ui/badge'
import { extendWithVariants, type VariantConfig } from '@/lib/ui-variant-extender'
import './ui-extensions.css'

// Semantic variant configuration for badges using UIX utility classes
const semanticVariantConfig: VariantConfig = {
  variants: {
    semantic: {
      success: 'bg-success text-success border-success',
      warning: 'bg-warning text-warning border-warning',
      info: 'bg-info text-info border-info',
      failure: 'bg-failure text-failure border-failure'
    }
  },
  defaultVariants: {
    // No default semantic variant specified, preserves original badge behavior
  }
}

// Extended Badge component with semantic variants
export const Badge = extendWithVariants(OriginalBadge, semanticVariantConfig)

// Re-export the original badge variants for compatibility
export { badgeVariants } from '@/components/ui/badge'
