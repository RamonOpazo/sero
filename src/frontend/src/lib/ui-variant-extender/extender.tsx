import React from 'react'
import { cn } from '@/lib/utils'
import type { TypedVariantConfig } from './types'

/**
 * Utility function to extend shadcn/ui components with additional variants
 */

export function extendWithVariants<
  TProps extends Record<string, any>,
  TVariants extends Record<string, Record<string, string | undefined>>
>(
  Component: React.ComponentType<TProps>,
  variantConfig: TypedVariantConfig<TVariants>
) {
  // Process variant configuration to auto-create default variants
  const processedConfig = {
    ...variantConfig,
    variants: { ...variantConfig.variants } as Record<string, Record<string, string | undefined>>,
    defaultVariants: { ...variantConfig.defaultVariants }
  }

  // Auto-create 'default' variant for each variant group if not present
  Object.keys(processedConfig.variants).forEach(variantKey => {
    if (!('default' in processedConfig.variants[variantKey])) {
      processedConfig.variants[variantKey] = {
        default: undefined, // Preserves original component styling (no additional classes)
        ...processedConfig.variants[variantKey]
      }
    }
  })

  // Auto-set default variants if not explicitly specified
  if (!variantConfig.defaultVariants) {
    processedConfig.defaultVariants = {}
    Object.keys(processedConfig.variants).forEach(variantKey => {
      processedConfig.defaultVariants![variantKey] = 'default'
    })
  } else {
    // Fill in 'default' for any missing defaultVariants
    Object.keys(processedConfig.variants).forEach(variantKey => {
      if (!(variantKey in processedConfig.defaultVariants!)) {
        processedConfig.defaultVariants![variantKey] = 'default'
      }
    })
  }
  
  const ExtendedComponent = (props: any) => {
    const { className, ...restProps } = props
    // Extract variant props
    const variantProps: Record<string, string> = {}
    const componentProps: Record<string, any> = {}
    
    Object.entries(restProps).forEach(([key, value]) => {
      if (key in processedConfig.variants) {
        variantProps[key] = value as string
      } else {
        componentProps[key] = value
      }
    })
    
    // Build base variant classes (handle undefined values)
    const variantClasses = Object.entries(processedConfig.variants)
      .map(([variantKey, variantOptions]) => {
        const selectedVariant = variantProps[variantKey] || processedConfig.defaultVariants?.[variantKey]
        if (!selectedVariant) return ''
        
        const className = variantOptions[selectedVariant as string]
        // Return empty string for undefined values (preserves original styling)
        return className ?? ''
      })
      .filter(Boolean)
    
    // Apply compound variants
    const compoundClasses = processedConfig.compoundVariants?.filter(compound => {
      return Object.entries(compound.conditions).every(([key, value]) => {
        const currentValue = variantProps[key] || processedConfig.defaultVariants?.[key]
        return currentValue === value
      })
    }).map(compound => compound.className) || []
    
    // Apply function overrides based on variant conditions
    const functionOverrides: Record<string, (...args: any[]) => any> = {}
    processedConfig.functionOverrides?.forEach(override => {
      const conditionsMet = Object.entries(override.conditions).every(([key, value]) => {
        const currentValue = variantProps[key] || processedConfig.defaultVariants?.[key]
        return currentValue === value
      })
      
      if (conditionsMet) {
        functionOverrides[override.functionName] = override.override
      }
    })
    
    // Combine all classes
    const combinedClassName = cn(...variantClasses, ...compoundClasses, className)
    
    // Prepare component props with className and function overrides
    const finalProps = {
      ...componentProps,
      ...functionOverrides, // Add function overrides as props
      className: combinedClassName
    } as unknown as TProps
    
    return (
      <Component {...finalProps} />
    )
  }
  
  ExtendedComponent.displayName = `Extended${Component.displayName || Component.name || 'Component'}`
  
  return ExtendedComponent
}

/**
 * Utility function to create variant configurations declaratively
 */
export function createVariantConfig<T extends Record<string, Record<string, string | undefined>>>(
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
    compoundVariants: options?.compoundVariants,
  }
}
