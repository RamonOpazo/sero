// Re-export all types
export type * from '../types/column-config'

// Re-export all factory functions
export * from './factories'

// Re-export all renderers
export * from './renderers'

// Re-export adapter functions
export * from './adapter'

// Re-export all presets
export * from './presets'

// Convenience exports for the most common patterns
export { column } from './factories'
export { columnPresets as presets } from './presets'
export { columnCombinations as combinations } from './presets'

// Main column creation utilities
import { column } from './factories'
import { columnPresets } from './presets'
import { columnCombinations } from './presets'

/**
 * Modern column builder - the main API for creating type-safe columns
 * 
 * Usage examples:
 * 
 * // Basic columns
 * columns.text('name', { header: 'Full Name', pinned: true })
 * columns.number('age', { align: 'right' })
 * columns.date('created_at', { format: { style: 'relative' } })
 * 
 * // Preset columns (common patterns)
 * columns.presets.name()
 * columns.presets.email()
 * columns.presets.activeStatus()
 * 
 * // Column combinations (full table layouts)
 * columns.combinations.userColumns()
 * columns.combinations.projectColumns()
 */
export const columns = {
  // Basic column factories
  ...column,
  
  // Pre-configured presets
  presets: columnPresets,
  
  // Common column combinations
  combinations: columnCombinations,
  
  // Utility functions for advanced use cases
  utils: {
    /**
     * Create multiple columns at once with the same configuration
     */
    multiple<TData>(
      keys: (keyof TData)[],
      factory: (key: keyof TData) => any
    ) {
      return keys.map(key => factory(key))
    },
    
    /**
     * Create conditional columns based on data properties
     */
    conditional<TData>(
      condition: (data: TData[]) => boolean,
      trueColumn: any,
      falseColumn?: any
    ) {
      // This would be implemented at the table level
      return { condition, trueColumn, falseColumn }
    }
  }
}

// Default export for convenience
export default columns

// Legacy compatibility - for gradual migration from old builder
export const createColumn = columns
export { createColumn as Column }
