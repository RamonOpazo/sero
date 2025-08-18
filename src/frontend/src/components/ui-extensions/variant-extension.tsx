import React from 'react'
import { cn } from '@/lib/utils'

/**
 * Pure variant extension function
 * 
 * Extends any React component with declarative variant support.
 * Does not include any hardcoded variants - completely generic.
 */
// Export the variant config type
export type VariantConfig = {
  variants: Record<string, Record<string, string>>
  defaultVariants?: Record<string, string>
  compoundVariants?: Array<{
    conditions: Record<string, string>
    className: string
  }>
}

export function extendWithVariants<
  TProps extends Record<string, any>,
  TVariants extends Record<string, Record<string, string>>
>(
  Component: React.ComponentType<TProps>,
  variantConfig: {
    variants: TVariants
    defaultVariants?: {
      [K in keyof TVariants]?: keyof TVariants[K]
    }
    compoundVariants?: Array<{
      conditions: {
        [K in keyof TVariants]?: keyof TVariants[K]
      }
      className: string
    }>
  }
) {
  type VariantProps = {
    [K in keyof TVariants]?: keyof TVariants[K]
  }
  
  type ExtendedProps = TProps & VariantProps & {
    className?: string
  }

  const ExtendedComponent = React.forwardRef<any, ExtendedProps>(
    ({ className, ...props }, ref) => {
      // Extract variant props
      const variantProps: Record<string, string> = {}
      const componentProps: Record<string, any> = {}
      
      Object.entries(props).forEach(([key, value]) => {
        if (key in variantConfig.variants) {
          variantProps[key] = value as string
        } else {
          componentProps[key] = value
        }
      })
      
      // Build base variant classes
      const variantClasses = Object.entries(variantConfig.variants).map(([variantKey, variantOptions]) => {
        const selectedVariant = variantProps[variantKey] || variantConfig.defaultVariants?.[variantKey]
        return selectedVariant ? variantOptions[selectedVariant as string] : ''
      }).filter(Boolean)
      
      // Apply compound variants
      const compoundClasses = variantConfig.compoundVariants?.filter(compound => {
        return Object.entries(compound.conditions).every(([key, value]) => {
          const currentValue = variantProps[key] || variantConfig.defaultVariants?.[key]
          return currentValue === value
        })
      }).map(compound => compound.className) || []
      
      // Combine all classes
      const combinedClassName = cn(...variantClasses, ...compoundClasses, className)
      
      return (
        <Component
          ref={ref}
          className={combinedClassName}
          {...(componentProps as TProps)}
        />
      )
    }
  )
  
  ExtendedComponent.displayName = `Extended${Component.displayName || Component.name || 'Component'}`
  
  return ExtendedComponent
}

/**
 * Utility function to create variant configurations declaratively
 */
export function createVariantConfig<T extends Record<string, Record<string, string>>>(
  variants: T,
  options?: {
    defaultVariants?: {
      [K in keyof T]?: keyof T[K]
    }
    compoundVariants?: Array<{
      conditions: {
        [K in keyof T]?: keyof T[K]
      }
      className: string
    }>
  }
) {
  return {
    variants,
    defaultVariants: options?.defaultVariants,
    compoundVariants: options?.compoundVariants
  }
}
