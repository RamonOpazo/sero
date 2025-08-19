import { Badge as OriginalBadge } from '@/components/ui/badge'
import { extendWithVariants, type VariantConfig } from '@/lib/ui-variant-extender'
import './ui-extensions.css'

// Semantic variant configuration for badges using UIX custom properties
const semanticVariantConfig: VariantConfig = {
  variants: {
    semantic: {
      warning: 'bg-[hsl(var(--uix-warning-bg))] text-[hsl(var(--uix-warning-text))] border-[hsl(var(--uix-warning-border))]',
      info: 'bg-[hsl(var(--uix-info-bg))] text-[hsl(var(--uix-info-text))] border-[hsl(var(--uix-info-border))]',
      success: 'bg-[hsl(var(--uix-success-bg))] text-[hsl(var(--uix-success-text))] border-[hsl(var(--uix-success-border))]',
      danger: 'bg-[hsl(var(--uix-danger-bg))] text-[hsl(var(--uix-danger-text))] border-[hsl(var(--uix-danger-border))]',
      neutral: 'bg-[hsl(var(--uix-neutral-bg))] text-[hsl(var(--uix-neutral-text))] border-[hsl(var(--uix-neutral-border))]'
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
