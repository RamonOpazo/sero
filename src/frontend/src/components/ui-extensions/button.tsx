import { Button as OriginalButton } from '@/components/ui/button'
import { extendWithVariants, type VariantConfig } from '@/lib/ui-variant-extender'
import './ui-extensions.css'

// Semantic variant configuration for buttons using UIX utility classes
const semanticVariantConfig: VariantConfig = {
  variants: {
    semantic: {
      success: 'rounded border border-success bg-transparent text-success text-sm hover:bg-success',
      warning: 'rounded border border-warning bg-transparent text-warning text-sm hover:bg-warning',
      info: 'rounded border border-info bg-transparent text-info text-sm hover:bg-info',
      failure: 'rounded border border-failure bg-transparent text-failure text-sm hover:bg-failure'
    }
  },
  defaultVariants: {
    // No default semantic variant specified, preserves original button behavior
  }
}

// Extended Button component with semantic variants
export const Button = extendWithVariants(OriginalButton, semanticVariantConfig)

// Re-export the original button variants for compatibility
export { buttonVariants } from '@/components/ui/button'
