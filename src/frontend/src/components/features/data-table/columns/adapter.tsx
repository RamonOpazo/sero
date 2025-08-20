import type { ColumnConfig } from '../types/column-config'
import type { Column } from '../types'
import { renderCell, renderHeader } from './renderers'

/**
 * Adapter function to convert new ColumnConfig to legacy Column format
 * This allows gradual migration while maintaining backward compatibility
 */
export function adaptColumn<TData>(config: ColumnConfig<TData>): Column<TData> {
  // Extract value from row using the accessor
  const getValue = (row: TData): any => {
    if (typeof config.accessor === 'string') {
      return row[config.accessor as keyof TData]
    } else if (typeof config.accessor === 'function') {
      return config.accessor(row)
    }
    return null
  }

  // Create the legacy column structure
  const legacyColumn: Column<TData> = {
    key: config.id,
    header: renderHeader(config),
    
    // Convert accessor to legacy format
    accessor: typeof config.accessor === 'string' 
      ? config.accessor as keyof TData
      : (row: TData) => getValue(row),
    
    // Create cell renderer that uses our new system
    cell: (_value: any, row: TData, index: number) => {
      // For new columns, we extract the value using our accessor
      const actualValue = getValue(row)
      return renderCell(actualValue, row, index, config)
    },
    
    // Map column type for legacy system
    type: mapColumnType(config.type),
    
    // Transfer other properties
    sortable: config.sortable === true || (typeof config.sortable === 'object' && config.sortable.enabled),
    pinFirstColumn: config.pinned,
    width: config.width,
    minWidth: config.minWidth,
  }

  return legacyColumn
}

/**
 * Map new column types to legacy types
 */
function mapColumnType(type: ColumnConfig['type']): Column['type'] {
  switch (type) {
    case 'select':
      return 'checkbox'
    case 'actions':
      return 'actions'
    default:
      return 'scrollable'
  }
}

/**
 * Convert an array of new column configs to legacy format
 */
export function adaptColumns<TData>(configs: ColumnConfig<TData>[]): Column<TData>[] {
  return configs.map(config => adaptColumn(config))
}

/**
 * Validation function to ensure column configurations are valid
 */
export function validateColumnConfig<TData>(config: ColumnConfig<TData>): string[] {
  const errors: string[] = []
  
  // Check required fields
  if (!config.id || config.id.trim() === '') {
    errors.push('Column id is required and cannot be empty')
  }
  
  if (!config.accessor) {
    errors.push('Column accessor is required')
  }
  
  // Type-specific validations
  switch (config.type) {
    case 'actions':
      const actionsConfig = config as any
      if (!actionsConfig.actions || !Array.isArray(actionsConfig.actions)) {
        errors.push('Actions column must have an actions array')
      } else if (actionsConfig.actions.length === 0) {
        errors.push('Actions column must have at least one action')
      }
      break
      
    case 'status':
      const statusConfig = config as any
      if (statusConfig.statusMap && typeof statusConfig.statusMap !== 'object') {
        errors.push('Status column statusMap must be an object')
      }
      break
      
    case 'number':
      const numberConfig = config as any
      if (numberConfig.format?.decimals && numberConfig.format.decimals < 0) {
        errors.push('Number column decimals must be non-negative')
      }
      break
  }
  
  // Width validations
  if (config.width && typeof config.width === 'string' && !isValidCSSLength(config.width)) {
    errors.push(`Invalid width value: ${config.width}`)
  }
  
  return errors
}

/**
 * Validate an array of column configurations
 */
export function validateColumns<TData>(configs: ColumnConfig<TData>[]): { valid: boolean; errors: Record<string, string[]> } {
  const errors: Record<string, string[]> = {}
  let hasErrors = false
  
  // Check for duplicate IDs
  const ids = configs.map(config => config.id)
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index)
  
  if (duplicateIds.length > 0) {
    errors['_global'] = [`Duplicate column IDs found: ${duplicateIds.join(', ')}`]
    hasErrors = true
  }
  
  // Validate each column
  configs.forEach(config => {
    const columnErrors = validateColumnConfig(config)
    if (columnErrors.length > 0) {
      errors[config.id] = columnErrors
      hasErrors = true
    }
  })
  
  return {
    valid: !hasErrors,
    errors
  }
}

/**
 * Helper function to check if a string is a valid CSS length
 */
function isValidCSSLength(value: string): boolean {
  // Simple regex for common CSS length units
  const cssLengthRegex = /^(\d+(\.\d+)?)(px|em|rem|%|vh|vw|pt|pc|in|cm|mm|ex|ch|auto|min|max)$/
  return cssLengthRegex.test(value.trim())
}

/**
 * Development helper to log column configuration for debugging
 */
export function debugColumn<TData>(config: ColumnConfig<TData>, data?: TData[]): void {
  if (process.env.NODE_ENV !== 'development') return
  
  console.group(`🔍 Column Debug: ${config.id}`)
  console.log('Configuration:', config)
  
  const validation = validateColumnConfig(config)
  if (validation.length > 0) {
    console.warn('Validation errors:', validation)
  } else {
    console.log('✅ Configuration is valid')
  }
  
  if (data && data.length > 0) {
    console.log('Sample data rendering:')
    const sampleValue = typeof config.accessor === 'string' 
      ? data[0][config.accessor as keyof TData]
      : typeof config.accessor === 'function' ? config.accessor(data[0]) : null
    console.log('Sample value:', sampleValue)
    
    try {
      const rendered = renderCell(sampleValue, data[0], 0, config)
      console.log('Rendered successfully:', rendered)
    } catch (error) {
      console.error('Rendering error:', error)
    }
  }
  
  console.groupEnd()
}

/**
 * Performance helper to measure column rendering performance
 */
export function measureColumnPerformance<TData>(
  configs: ColumnConfig<TData>[],
  data: TData[],
  iterations: number = 1000
): Record<string, number> {
  const results: Record<string, number> = {}
  
  configs.forEach(config => {
    const start = performance.now()
    
    for (let i = 0; i < iterations; i++) {
      const row = data[i % data.length]
      const value = typeof config.accessor === 'string' 
        ? row[config.accessor as keyof TData]
        : typeof config.accessor === 'function' ? config.accessor(row) : null
      renderCell(value, row, i % data.length, config)
    }
    
    const end = performance.now()
    results[config.id] = end - start
  })
  
  return results
}
