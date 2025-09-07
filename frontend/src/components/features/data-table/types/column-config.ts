import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

// Base types for column values
export type ColumnValue = string | number | boolean | Date | null | undefined
export type CellValue<T> = T[keyof T]

// Column alignment options
export type ColumnAlignment = 'left' | 'center' | 'right'

// Column width options
export type ColumnWidth = string | number | 'auto' | 'min' | 'max'

// Accessor types - strongly typed accessors for data extraction
export type ColumnAccessor<TData, TValue> = 
  | keyof TData
  | ((row: TData, index?: number) => TValue)

// Cell renderer types
export type CellRenderer<TData, TValue> = (
  value: TValue,
  row: TData,
  index: number
) => ReactNode

// Header renderer types  
export type HeaderRenderer = ReactNode | (() => ReactNode)

// Sorting configuration
export interface SortConfig {
  enabled: boolean
  sortFn?: <TData>(a: TData, b: TData) => number
}

// Base column configuration - all columns extend this
export interface BaseColumnConfig<TData = any, TValue = any> {
  /** Unique identifier for the column */
  id: string
  
  /** How to extract the value from row data */
  accessor: ColumnAccessor<TData, TValue>
  
  /** Header content */
  header: HeaderRenderer
  
  /** Custom cell renderer */
  cell?: CellRenderer<TData, TValue>
  
  /** Column width configuration */
  width?: ColumnWidth
  minWidth?: ColumnWidth
  maxWidth?: ColumnWidth
  
  /** Column alignment */
  align?: ColumnAlignment
  
  /** Whether column is sortable */
  sortable?: boolean | SortConfig
  
  /** Whether column should be pinned */
  pinned?: boolean
  
  /** Whether column is visible */
  visible?: boolean
  
  /** CSS classes for the column */
  className?: string
  
  /** Additional metadata */
  meta?: Record<string, any>
}

// Specialized column types
export interface TextColumnConfig<TData = any> extends BaseColumnConfig<TData, string> {
  type: 'text'
  /** Maximum characters before truncation */
  maxLength?: number
  /** Placeholder for empty values */
  placeholder?: string
  /** Text transformation */
  transform?: 'uppercase' | 'lowercase' | 'capitalize'
}

export interface NumberColumnConfig<TData = any> extends BaseColumnConfig<TData, number> {
  type: 'number'
  /** Number formatting options */
  format?: {
    decimals?: number
    prefix?: string
    suffix?: string
    thousands?: string
    locale?: string
  }
}

export interface DateColumnConfig<TData = any> extends BaseColumnConfig<TData, string | Date> {
  type: 'date'
  /** Date formatting options */
  format?: {
    style?: 'relative' | 'absolute' | 'custom'
    pattern?: string // For custom format
    locale?: string
  }
}

export interface BooleanColumnConfig<TData = any> extends BaseColumnConfig<TData, boolean> {
  type: 'boolean'
  /** How to display boolean values */
  display?: {
    true: ReactNode
    false: ReactNode
  }
}

export interface BadgeColumnConfig<TData = any> extends BaseColumnConfig<TData, string | number> {
  type: 'badge'
  /** Badge styling */
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  /** Color mapping for different values */
  colorMap?: Record<string, string>
}

export interface StatusColumnConfig<TData = any> extends BaseColumnConfig<TData, string> {
  type: 'status'
  /** Status configuration mapping */
  statusMap?: Record<string, {
    label?: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
    color?: string
    icon?: LucideIcon
  }>
}

export interface ActionsColumnConfig<TData = any> extends BaseColumnConfig<TData, any> {
  type: 'actions'
  /** Action definitions */
  actions: Array<{
    id: string
    label: string
    icon?: LucideIcon
    variant?: 'default' | 'destructive' | 'ghost'
    onClick: (row: TData) => void
    disabled?: (row: TData) => boolean
    hidden?: (row: TData) => boolean
  }>
}

export interface SelectColumnConfig<TData = any> extends BaseColumnConfig<TData, boolean> {
  type: 'select'
  /** Selection configuration */
  onSelectionChange?: (selectedRows: TData[]) => void
}

export interface CustomColumnConfig<TData = any, TValue = any> extends BaseColumnConfig<TData, TValue> {
  type: 'custom'
  /** Custom column implementation */
  render: CellRenderer<TData, TValue>
}

// Union type for all column configurations
export type ColumnConfig<TData = any> = 
  | TextColumnConfig<TData>
  | NumberColumnConfig<TData>
  | DateColumnConfig<TData>
  | BooleanColumnConfig<TData>
  | BadgeColumnConfig<TData>
  | StatusColumnConfig<TData>
  | ActionsColumnConfig<TData>
  | SelectColumnConfig<TData>
  | CustomColumnConfig<TData>

// Helper type to extract data type from column config
export type InferDataType<T> = T extends ColumnConfig<infer U> ? U : never

// Helper type to extract value type from column config
export type InferValueType<T> = T extends BaseColumnConfig<any, infer U> ? U : never

// Column definition array type
export type ColumnDefinitions<TData = any> = readonly ColumnConfig<TData>[]

// Utility type for type-safe column creation
export type CreateColumnConfig<TData, TKey extends keyof TData> = {
  [K in TKey]: TData[K]
}
