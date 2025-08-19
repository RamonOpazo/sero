// Main component
export { DataTable } from './components/data-table'

// Sub-components for custom compositions
export { TableToolbar } from './components/table-toolbar'
export { TableContent } from './components/table-content'

// Declarative builders
export { ColumnBuilder, Column as createColumn, ActionBuilder, Actions } from './builders'

// Types
export type {
  Column,
  ColumnWidthConfig,
  DataTableProps,
  TableToolbarProps,
  TableContentProps
} from './types'

// Constants
export { DEFAULT_COLUMN_WIDTHS } from './constants'

// CSS import for consumers
import './data-table.css'
