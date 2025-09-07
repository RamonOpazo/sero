import type { ColumnWidthConfig } from './types'

/**
 * Default column widths for different column types
 * These can be overridden by passing columnWidths prop to DataTableV2
 */
export const DEFAULT_COLUMN_WIDTHS: Required<ColumnWidthConfig> = {
  checkbox: '2.5rem',
  pinned: '200px',
  scrollable: '150px',
  actions: '80px',
}

/**
 * Merge user-provided column widths with defaults
 */
export function mergeColumnWidths(customWidths?: ColumnWidthConfig): Required<ColumnWidthConfig> {
  return {
    ...DEFAULT_COLUMN_WIDTHS,
    ...customWidths,
  }
}
