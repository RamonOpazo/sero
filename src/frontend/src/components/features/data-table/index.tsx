// Main component
export { DataTable } from './components/data-table'

// Sub-components for custom compositions
export { TableToolbar } from './components/table-toolbar'
export { TableContent } from './components/table-content'
export { TablePagination } from './components/table-pagination'

// Types
export type {
  Column,
  ColumnWidthConfig,
  DataTableProps,
  TableToolbarProps,
  TableContentProps
} from './types'
export type { PaginationState, TablePaginationProps } from './components/table-pagination'

// Constants
export { DEFAULT_COLUMN_WIDTHS } from './constants'

// CSS import for consumers
import './data-table.css'
