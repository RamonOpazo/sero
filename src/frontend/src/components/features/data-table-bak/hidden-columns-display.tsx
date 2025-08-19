import { useState } from 'react'
import { ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui-extensions/badge'
import type { ExtendedColumnDef } from './hooks/use-responsive-columns'

interface HiddenColumnsDisplayProps<TData> {
  hiddenColumns: ExtendedColumnDef[]
  rowData: TData
  className?: string
}

export function HiddenColumnsDisplay<TData>({ 
  hiddenColumns, 
  rowData,
  className = ''
}: HiddenColumnsDisplayProps<TData>) {
  const [isOpen, setIsOpen] = useState(false)

  if (hiddenColumns.length === 0) {
    return null
  }

  const renderColumnValue = (column: ExtendedColumnDef) => {
    try {
      if (column.cell && typeof column.cell === 'function') {
        // Create a mock cell context
        const mockContext = {
          row: {
            original: rowData,
            getValue: (key: string) => (rowData as any)[key]
          },
          column: {
            id: column.id || 'unknown'
          },
          table: {},
          cell: {},
          getValue: () => (rowData as any)[column.accessorKey || '']
        }
        
        const cellContent = column.cell(mockContext as any)
        return cellContent
      }

      // Fallback to raw value
      const value = (rowData as any)[column.accessorKey || '']
      return String(value || '-')
    } catch (error) {
      console.warn('Error rendering hidden column:', error)
      return '-'
    }
  }

  const getColumnHeader = (column: ExtendedColumnDef): string => {
    if (typeof column.header === 'string') {
      return column.header
    }
    if (typeof column.header === 'function') {
      try {
        const headerContent = column.header({} as any)
        if (typeof headerContent === 'string') {
          return headerContent
        }
        // Extract text from React elements if possible
        return column.id || 'Column'
      } catch {
        return column.id || 'Column'
      }
    }
    return column.id || 'Column'
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${className}`}
          title={`Show ${hiddenColumns.length} hidden column${hiddenColumns.length === 1 ? '' : 's'}`}
        >
          <Eye className="h-4 w-4" />
          {hiddenColumns.length > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-1 h-4 w-4 rounded-full p-0 text-xs"
            >
              {String(hiddenColumns.length)}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Hidden Columns
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {hiddenColumns.map((column, index) => {
          const header = getColumnHeader(column)
          const value = renderColumnValue(column)
          
          return (
            <DropdownMenuItem
              key={column.id || index}
              className="flex flex-col items-start gap-1 p-3 cursor-default"
              onSelect={(e) => e.preventDefault()} // Prevent closing on click
            >
              <div className="font-medium text-sm text-muted-foreground">
                {header}
              </div>
              <div className="text-sm max-w-full break-words">
                {value}
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Inline version for smaller displays
export function HiddenColumnsInline<TData>({ 
  hiddenColumns, 
  rowData,
  className = '' 
}: HiddenColumnsDisplayProps<TData>) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (hiddenColumns.length === 0) {
    return null
  }

  const renderColumnValue = (column: ExtendedColumnDef) => {
    try {
      if (column.cell && typeof column.cell === 'function') {
        const mockContext = {
          row: {
            original: rowData,
            getValue: (key: string) => (rowData as any)[key]
          },
          column: { id: column.id || 'unknown' },
          table: {},
          cell: {},
          getValue: () => (rowData as any)[column.accessorKey || '']
        }
        
        return column.cell(mockContext as any)
      }

      const value = (rowData as any)[column.accessorKey || '']
      return String(value || '-')
    } catch {
      return '-'
    }
  }

  const getColumnHeader = (column: ExtendedColumnDef): string => {
    if (typeof column.header === 'string') {
      return column.header
    }
    return column.id || 'Column'
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-xs"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 mr-1" />
        ) : (
          <ChevronRight className="h-3 w-3 mr-1" />
        )}
        {hiddenColumns.length} more field{hiddenColumns.length === 1 ? '' : 's'}
      </Button>
      
      {isExpanded && (
        <div className="space-y-1 pl-4 border-l-2 border-border">
          {hiddenColumns.map((column, index) => {
            const header = getColumnHeader(column)
            const value = renderColumnValue(column)
            
            return (
              <div key={column.id || index} className="text-xs">
                <div className="font-medium text-muted-foreground mb-0.5">
                  {header}:
                </div>
                <div className="text-foreground break-words">
                  {value}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
