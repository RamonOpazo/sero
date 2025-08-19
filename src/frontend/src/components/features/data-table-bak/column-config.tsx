import { type ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import React from 'react'
import type { ResponsiveColumnConfig } from './hooks/use-responsive-columns'

// Re-export ResponsiveColumnConfig from responsive columns hook
export type { ResponsiveColumnConfig } from './hooks/use-responsive-columns'

// Pure column configuration interface
export interface ColumnConfig<TData, TValue = unknown> {
  // Required
  id: string
  accessor: keyof TData
  header: string
  
  // Display options
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  width?: number | string
  minWidth?: number | string
  maxWidth?: number | string
  className?: string
  
  // Rendering
  render?: (value: TValue, row: TData) => React.ReactNode
  
  // Advanced options
  enableHiding?: boolean
  enableResizing?: boolean
  
  // Responsive behavior
  responsive?: ResponsiveColumnConfig
  
  // Sorting customization
  sortingFn?: (rowA: any, rowB: any, columnId: string) => number
}

// Default values
const DEFAULTS = {
  align: 'left' as const,
  enableHiding: true,
  enableResizing: false,
  sortable: false,
}

// Pure column creation function
export function createColumn<TData, TValue = unknown>(
  config: ColumnConfig<TData, TValue>
): ColumnDef<TData, TValue> {
  const {
    id,
    accessor,
    header,
    sortable = DEFAULTS.sortable,
    align = DEFAULTS.align,
    width,
    minWidth,
    maxWidth,
    className,
    render,
    enableHiding = DEFAULTS.enableHiding,
    enableResizing = DEFAULTS.enableResizing,
    responsive,
    sortingFn,
  } = config

  // Build the column definition
  const columnDef: ColumnDef<TData, TValue> & { responsive?: ResponsiveColumnConfig } = {
    id,
    accessorKey: accessor as string,
    enableHiding,
    enableResizing,
    size: typeof width === 'number' ? width : undefined,
    minSize: typeof minWidth === 'number' ? minWidth : undefined,
    maxSize: typeof maxWidth === 'number' ? maxWidth : undefined,
    responsive,
  }

  // Handle header
  if (sortable) {
    columnDef.header = ({ column }) => (
      <div className={`flex items-center text-${align}`}>
        {header}
        <Button
          className="h-6 w-6 ml-2 p-2"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>
    )
  } else {
    columnDef.header = () => (
      <div className={`text-${align}`}>{header}</div>
    )
  }

  // Handle cell rendering
  columnDef.cell = ({ row }) => {
    const value = row.getValue(accessor as string) as TValue

    // Use custom render function if provided
    if (render) {
      const content = render(value, row.original)
      return (
        <div className={`text-${align} ${className || ''}`}>
          {content}
        </div>
      )
    }

    // Default rendering - just display the value
    return (
      <div className={`text-${align} ${className || ''}`}>
        {String(value || '-')}
      </div>
    )
  }

  // Add custom sorting function if provided
  if (sortingFn) {
    columnDef.sortingFn = sortingFn
  }

  return columnDef
}

// Pure helper functions for creating column configurations
export const column = {
  /**
   * Create a basic column configuration
   */
  create: <TData extends Record<string, any>, TValue = unknown>(
    accessor: keyof TData,
    header: string,
    options?: Partial<ColumnConfig<TData, TValue>>
  ): ColumnConfig<TData, TValue> => ({
    id: accessor as string,
    accessor,
    header,
    ...options
  }),

  /**
   * Create a column with custom rendering
   */
  custom: <TData extends Record<string, any>, TValue = unknown>(
    accessor: keyof TData,
    header: string,
    render: (value: TValue, row: TData) => React.ReactNode,
    options?: Partial<ColumnConfig<TData, TValue>>
  ): ColumnConfig<TData, TValue> => ({
    id: accessor as string,
    accessor,
    header,
    render,
    ...options
  })
}
