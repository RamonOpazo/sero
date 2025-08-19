/**
 * Type definitions for UI Variant Extender
 */

/**
 * Configuration object for defining component variants
 */
export type VariantConfig = {
  /** The variant definitions - each key is a variant name, each value is an object mapping variant values to CSS classes */
  variants: Record<string, Record<string, string>>
  /** Default values for variants */
  defaultVariants?: Record<string, string>
  /** Compound variants that apply additional classes when multiple conditions are met */
  compoundVariants?: Array<{
    /** Conditions that must be met for this compound variant to apply */
    conditions: Record<string, string>
    /** CSS class to apply when conditions are met */
    className: string
  }>
}

/**
 * Typed variant configuration that provides better type inference
 * for the extendWithVariants function
 */
export type TypedVariantConfig<TVariants extends Record<string, Record<string, string>>> = {
  /** The variant definitions with specific types for better inference */
  variants: TVariants
  /** Default values for variants, constrained to actual variant keys and values */
  defaultVariants?: {
    [K in keyof TVariants]?: keyof TVariants[K]
  }
  /** Compound variants that apply additional classes when multiple conditions are met */
  compoundVariants?: Array<{
    /** Conditions constrained to actual variant keys and values */
    conditions: {
      [K in keyof TVariants]?: keyof TVariants[K]
    }
    /** CSS class to apply when conditions are met */
    className: string
  }>
}
