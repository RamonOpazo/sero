import type { ReactNode } from 'react'
import type { SimpleColumn } from '../columns/simple'

export interface ColumnWidthConfig {
  /** Default width for checkbox columns */
  checkbox?: string | number
  /** Default width for pinned columns */
  pinned?: string | number
  /** Default width for scrollable columns */
  scrollable?: string | number
  /** Default width for actions columns */
  actions?: string | number
}

export interface Column<T = any> {
  key: string
  header: ReactNode
  accessor?: keyof T | ((row: T) => ReactNode)
  cell?: (value: any, row: T, index: number) => ReactNode
  type?: 'checkbox' | 'scrollable' | 'actions'
  pinFirstColumn?: boolean
  sortable?: boolean
  width?: string | number
  minWidth?: string | number
  alignment?: 'left' | 'center' | 'right'
}

export interface DataTableProps<T = any> {
  data: T[]
  /** Legacy column model (will be used as-is if provided) */
  columns?: Column<T>[]
  /** New simple declarative model (preferred). If provided, it will be adapted internally. */
  columnDefs?: SimpleColumn<T>[]
  title?: string
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  onRowSelect?: (selectedRows: T[]) => void
  onRowAction?: (action: string, row: T) => void
  showCheckboxes?: boolean
  showActions?: boolean
  searchValue?: string
  selectedRows?: T[]
  actions?: Array<{
    label: string
    value: string
    variant?: 'default' | 'destructive'
  }>
  filters?: Array<{
    label: string
    key: string
    options: Array<{ label: string; value: string }>
    value?: string
    onChange?: (value: string) => void
  }>
  onAddNew?: () => void
  addNewLabel?: string
  className?: string
  /** Configure default widths for different column types */
  columnWidths?: ColumnWidthConfig
  
  // Advanced search features
  searchColumns?: SearchColumnOption[]
  selectedSearchColumn?: string
  onSearchColumnChange?: (columnKey: string) => void
  
  // Column visibility features
  tableColumns?: ColumnOption[]
  visibleColumns?: string[]
  onColumnVisibilityChange?: (columnKey: string, visible: boolean) => void
  
  // Custom buttons
  customButtons?: CustomButtonOption[]
  
  // Pagination props
  pagination?: {
    pageIndex: number
    pageSize: number
    totalItems?: number // Optional - if not provided, will use data.length
    onPageChange: (pageIndex: number) => void
    onPageSizeChange: (pageSize: number) => void
    pageSizeOptions?: number[]
    showPagination?: boolean
  }
}

// Search column configuration for toolbar
export interface SearchColumnOption {
  key: string
  header: string
}

// Column configuration for visibility toggle
export interface ColumnOption {
  key: string
  header: string
}

// Custom button configuration for toolbar
export interface CustomButtonOption {
  label: string
  onClick: () => void
  icon?: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  disabled?: boolean
}

export interface TableToolbarProps {
  title?: string
  searchPlaceholder?: string
  searchValue?: string
  onSearch?: (query: string) => void
  filters?: Array<{
    label: string
    key: string
    options: Array<{ label: string; value: string }>
    value?: string
    onChange?: (value: string) => void
  }>
  onAddNew?: () => void
  addNewLabel?: string
  
  // Advanced search features
  searchColumns?: SearchColumnOption[]
  selectedSearchColumn?: string
  onSearchColumnChange?: (columnKey: string) => void
  
  // Column visibility features
  columns?: ColumnOption[]
  visibleColumns?: string[]
  onColumnVisibilityChange?: (columnKey: string, visible: boolean) => void
  
  // Custom buttons
  customButtons?: CustomButtonOption[]
}

export interface TableContentProps<T = any> {
  data: T[]
  columns: Column<T>[]
  selectedRows?: T[]
  onRowSelect?: (selectedRows: T[]) => void
  onRowAction?: (action: string, row: T) => void
  showCheckboxes?: boolean
  showActions?: boolean
  actions?: Array<{
    label: string
    value: string
    variant?: 'default' | 'destructive'
  }>
  /** Configure default widths for different column types */
  columnWidths?: ColumnWidthConfig
}
