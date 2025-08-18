import { Badge as OriginalBadge } from '@/components/ui/badge'
import { extendWithVariants, type VariantConfig } from './variant-extension'

// Semantic variant configuration for badges (more subtle colors)
const semanticVariantConfig: VariantConfig = {
  variants: {
    semantic: {
      warning: 'bg-yellow-50 text-yellow-800 border-yellow-100',
      info: 'bg-blue-50 text-blue-800 border-blue-100',
      success: 'bg-green-50 text-green-800 border-green-100',
      danger: 'bg-red-50 text-red-800 border-red-100',
      neutral: 'bg-muted text-muted-foreground border-border'
    }
  },
  defaultVariants: {
    semantic: 'neutral'
  }
}

// Extended Badge component with semantic variants
export const Badge = extendWithVariants(OriginalBadge, semanticVariantConfig)

// Re-export the original badge variants for compatibility
export { badgeVariants } from '@/components/ui/badge'
