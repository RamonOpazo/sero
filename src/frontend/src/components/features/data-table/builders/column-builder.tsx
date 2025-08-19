import { type ReactNode } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Column as ColumnType } from '../types'

// Utility function for date formatting
const formatDate = (dateString: string) => {
  if (!dateString) return "-"
  
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  } catch {
    return 'Unknown'
  }
}

// Status color mapping
const statusColors = {
  awaiting: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200', 
  completed: 'bg-green-50 text-green-700 border-green-200',
  processed: 'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  error: 'bg-red-50 text-red-700 border-red-200',
} as const

export class ColumnBuilder<TData extends Record<string, any>, TValue = unknown> {
  private column: Partial<ColumnType<TData>>

  constructor(key: string) {
    this.column = { key }
  }

  // Basic column types with automatic CSS class assignment
  static text<TData extends Record<string, any>>(key: string): ColumnBuilder<TData, string> {
    const builder = new ColumnBuilder<TData, string>(key)
    builder.column.type = 'scrollable' // Default to scrollable
    return builder
  }

  static number<TData extends Record<string, any>>(key: string): ColumnBuilder<TData, number> {
    const builder = new ColumnBuilder<TData, number>(key)
    builder.column.type = 'scrollable'
    return builder
  }

  static date<TData extends Record<string, any>>(key: string): ColumnBuilder<TData, string> {
    const builder = new ColumnBuilder<TData, string>(key)
    builder.column.type = 'scrollable'
    builder.column.cell = (value: any) => (
      <div className="text-muted-foreground text-sm">
        {formatDate(value as string)}
      </div>
    )
    return builder
  }

  static badge<TData extends Record<string, any>>(key: string): ColumnBuilder<TData, string> {
    const builder = new ColumnBuilder<TData, string>(key)
    builder.column.type = 'scrollable'
    builder.column.cell = (value: any) => (
      <div className="text-left">
        <Badge variant="secondary">{value || 0}</Badge>
      </div>
    )
    return builder
  }

  static status<TData extends Record<string, any>>(key: string): ColumnBuilder<TData, string> {
    const builder = new ColumnBuilder<TData, string>(key)
    builder.column.type = 'scrollable'
    builder.column.cell = (value: any) => {
      const status = value as string
      if (typeof status !== 'string' || !status) {
        return <Badge variant="outline">Unknown</Badge>
      }
      const colorClass = statusColors[status as keyof typeof statusColors] || statusColors.error
      
      return (
        <Badge variant="outline" className={colorClass}>
          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
        </Badge>
      )
    }
    return builder
  }

  // Positioning modifiers - these set CSS classes
  pinned(): this {
    this.column.pinFirstColumn = true
    return this
  }

  checkbox(): this {
    this.column.type = 'checkbox'
    return this
  }

  actions(): this {
    this.column.type = 'actions'
    return this
  }

  // Content modifiers
  header(title: string): this {
    this.column.header = title
    return this
  }

  sortable(title?: string): this {
    const headerTitle = title || (this.column.key as string)
    this.column.header = (
      <div className="flex items-center">
        {headerTitle.charAt(0).toUpperCase() + headerTitle.slice(1)}
        <Button
          className="h-6 w-6 ml-2 p-2"
          variant="ghost"
          onClick={() => {
            // This will be handled by the table implementation
            console.log('Sort clicked for', this.column.key)
          }}
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>
    )
    this.column.sortable = true
    return this
  }

  align(position: "left" | "center" | "right" = "left"): this {
    const originalCell = this.column.cell
    this.column.cell = originalCell ? 
      (value: any, row: any, index: any) => <div className={`text-${position}`}>{originalCell(value, row, index)}</div> :
      (value: any) => <div className={`text-${position}`}>{value}</div>
    
    const originalHeader = this.column.header
    if (typeof originalHeader === 'string') {
      this.column.header = <div className={`text-${position}`}>{originalHeader}</div>
    }
    return this
  }

  truncate(maxChars = 15): this {
    const originalCell = this.column.cell
    const cellStyle = { maxWidth: `${maxChars}ch` }

    this.column.cell = originalCell
      ? (value: any, row: any, index: any) => (
          <div className="text-muted-foreground truncate" style={cellStyle}>
            {originalCell(value, row, index) || 'No description'}
          </div>
        )
      : (value: any) => (
          <div className="text-muted-foreground truncate" style={cellStyle}>
            {(value as string) || 'No description'}
          </div>
        )
    return this
  }

  format(formatter: (value: TValue) => ReactNode): this {
    this.column.cell = (value: any) => formatter(value as TValue)
    return this
  }

  withClass(className: string): this {
    const originalCell = this.column.cell
    this.column.cell = originalCell ?
      (value: any, row: any, index: any) => (
        <div className={className}>{originalCell(value, row, index)}</div>
      ) :
      (value: any) => <div className={className}>{value}</div>
    return this
  }

  // Width modifiers
  width(w: string | number): this {
    this.column.width = w
    return this
  }

  minWidth(w: string | number): this {
    this.column.minWidth = w
    return this
  }

  // Accessor modifiers
  accessor(fn: (row: TData) => ReactNode): this {
    this.column.accessor = fn
    return this
  }

  build(): ColumnType<TData> {
    // Set default header if not provided
    if (!this.column.header) {
      this.column.header = this.column.key
    }

    return this.column as ColumnType<TData>
  }
}

// Export convenience function
export const Column = ColumnBuilder
