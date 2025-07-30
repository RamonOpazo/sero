import { type ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Utility function for date formatting
const formatDate = (dateString: string) => {
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

class ColumnBuilder<TData, TValue = unknown> {
  private columnDef: Partial<ColumnDef<TData, TValue>> & { accessorKey: string }

  constructor(accessor: string) {
    this.columnDef = { accessorKey: accessor }
  }

  // Basic column types
  static text<TData>(accessor: string): ColumnBuilder<TData, string> {
    return new ColumnBuilder<TData, string>(accessor)
  }

  static number<TData>(accessor: string): ColumnBuilder<TData, number> {
    return new ColumnBuilder<TData, number>(accessor)
  }

  static date<TData>(accessor: string): ColumnBuilder<TData, string> {
    const builder = new ColumnBuilder<TData, string>(accessor)
    builder.columnDef.cell = ({ row }) => {
      const value = row.getValue(accessor) as string
      return (
        <div className="text-muted-foreground text-sm">
          {formatDate(value)}
        </div>
      )
    }
    return builder
  }

  static badge<TData>(accessor: string): ColumnBuilder<TData, string> {
    const builder = new ColumnBuilder<TData, string>(accessor)
    builder.columnDef.cell = ({ row }) => {
      const value = row.getValue(accessor) as string
      return (
        <div className="text-left">
          <Badge variant="secondary">{value || 0}</Badge>
        </div>
      )
    }
    return builder
  }

  static status<TData>(accessor: string): ColumnBuilder<TData, string> {
    const builder = new ColumnBuilder<TData, string>(accessor)
    builder.columnDef.cell = ({ row }) => {
      const status = row.getValue(accessor) as string
      const colorClass = statusColors[status as keyof typeof statusColors] || statusColors.error
      
      return (
        <Badge variant="outline" className={colorClass}>
          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
        </Badge>
      )
    }
    
    // Add custom sorting for statuses
    builder.columnDef.sortingFn = (rowA, rowB) => {
      const getStatusPriority = (status: string) => {
        switch (status) {
          case 'awaiting': return 0
          case 'pending': return 0
          case 'in_progress': return 1
          case 'completed': return 2
          case 'processed': return 2
          default: return 3
        }
      }
      
      const statusA = rowA.getValue(accessor) as string
      const statusB = rowB.getValue(accessor) as string
      
      return getStatusPriority(statusA) - getStatusPriority(statusB)
    }
    
    return builder
  }


  // Modifiers
  header(title: string): this {
    this.columnDef.header = title
    return this
  }

  sortable(title?: string): this {
    const headerTitle = title || (this.columnDef.accessorKey as string)
    this.columnDef.header = ({ column }) => (
      <div className="flex items-center">
        {headerTitle.charAt(0).toUpperCase() + headerTitle.slice(1)}
        <Button
          className="h-6 w-6 ml-2 p-2"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>
    )
    return this
  }

  align(position: "left" | "center" | "right" = "left"): this {
    const originalCell = this.columnDef.cell
    this.columnDef.cell = originalCell ? 
      (props) => <div className={`text-${position}`}>{(originalCell as any)(props)}</div> :
      ({ row }) => <div className={`text-${position}`}>{row.getValue(this.columnDef.accessorKey as string)}</div>
    
    const originalHeader = this.columnDef.header
    if (typeof originalHeader === 'string') {
      this.columnDef.header = () => <div className={`text-${position}`}>{originalHeader}</div>
    }
    return this
  }

  truncate(maxWidth = '15ch'): this {
    const originalCell = this.columnDef.cell
    this.columnDef.cell = originalCell ?
      (props) => <div className={`max-w-[${maxWidth}] text-muted-foreground`} style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{(originalCell as any)(props) || 'No description'}</div> :
      ({ row }) => {
        const value = row.getValue(this.columnDef.accessorKey as string) as string
        return <div className={`max-w-[${maxWidth}] text-muted-foreground`} style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{value || 'No description'}</div>
      }
    return this
  }

  format(formatter: (value: TValue) => React.ReactNode): this {
    this.columnDef.cell = ({ row }) => {
      const value = row.getValue(this.columnDef.accessorKey as string) as TValue
      return formatter(value)
    }
    return this
  }

  withClass(className: string | undefined = undefined): this {
    this.columnDef.cell = ({ row }) => {
      const value = row.getValue(this.columnDef.accessorKey as string) as string
      return <div className={className}>{value}</div>
    }
    return this
  }

  build(): ColumnDef<TData, TValue> {
    return this.columnDef as ColumnDef<TData, TValue>
  }
}

// Export both the class and a convenience function
export { ColumnBuilder }
export const Column = ColumnBuilder
