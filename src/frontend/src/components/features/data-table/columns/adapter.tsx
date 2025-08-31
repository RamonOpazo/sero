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
