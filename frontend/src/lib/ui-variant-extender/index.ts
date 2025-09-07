/**
 * UI Variant Extender
 * 
 * Utilities for extending shadcn/ui components with additional variants
 * while preserving type safety and the original component API.
 * 
 * @example
 * ```tsx
 * import { Badge as OriginalBadge } from '@/components/ui/badge'
 * import { extendWithVariants } from '@/lib/ui-variant-extender'
 * 
 * const ExtendedBadge = extendWithVariants(OriginalBadge, {
 *   variants: {
 *     semantic: {
 *       success: 'bg-green-100 text-green-800',
 *       warning: 'bg-yellow-100 text-yellow-800',
 *     }
 *   },
 *   defaultVariants: {
 *     semantic: 'success'
 *   }
 * })
 * ```
 */

export {
  extendWithVariants,
  createVariantConfig,
} from './extender'

export type {
  VariantConfig,
  TypedVariantConfig,
} from './types'
