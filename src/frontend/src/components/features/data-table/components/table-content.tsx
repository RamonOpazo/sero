import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontal } from 'lucide-react'
import type { TableContentProps, Column } from '../types'
import { mergeColumnWidths } from '../constants'
import '../data-table.css'

export function TableContent<T extends Record<string, any>>({
  data,
  columns,
  selectedRows = [],
  onRowSelect,
  onRowAction,
  showCheckboxes = false,
  showActions = false,
  actions = [],
  columnWidths
}: TableContentProps<T>) {
  const [allSelected, setAllSelected] = useState(false)
  
  // Merge user-provided column widths with defaults
  const widthConfig = mergeColumnWidths(columnWidths)

  // Helper function to get cell value
  const getCellValue = (row: T, column: Column<T>) => {
    // Handle actions columns by rendering the actions dropdown
    if (column.type === 'actions') {
      const alignmentClass = column.alignment ? `text-${column.alignment}` : 'text-center'
      return (
        <div className={alignmentClass}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {actions.map((action: any) => (
                <DropdownMenuItem
                  key={action.value}
                  onClick={() => onRowAction?.(action.value, row)}
                  className={action.variant === 'destructive' ? 'text-red-600' : ''}
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
    
    if (column.cell) {
      return column.cell(row[column.key], row, data.indexOf(row))
    }
    
    if (typeof column.accessor === 'function') {
      return column.accessor(row)
    }
    
    if (column.accessor) {
      return row[column.accessor]
    }
    
    return row[column.key]
  }

  // Row selection handlers
  const handleSelectAll = (checked: boolean) => {
    setAllSelected(checked)
    if (onRowSelect) {
      onRowSelect(checked ? data : [])
    }
  }

  const handleRowSelect = (row: T, checked: boolean) => {
    if (!onRowSelect) return
    
    const newSelection = checked
      ? [...selectedRows, row]
      : selectedRows.filter((r: T) => r !== row)
    
    onRowSelect(newSelection)
    setAllSelected(newSelection.length === data.length)
  }

  const isRowSelected = (row: T) => selectedRows.includes(row)

  // Separate columns by type and apply CSS classes
  const checkboxColumn = showCheckboxes
  const pinnedColumns = columns.filter((col: Column<T>) => col.pinFirstColumn === true)
  const scrollableColumns = columns.filter((col: Column<T>) => 
    !col.pinFirstColumn && (col.type === 'scrollable' || col.type === 'actions' || !col.type)
  )
  // Check if we have any actions columns in our column definitions
  const hasActionsColumn = columns.some((col: Column<T>) => col.type === 'actions')
  const actionsColumn = showActions && !hasActionsColumn // Only show legacy actions if no actions column exists

  // Helper function to get CSS class based on column type
  const getColumnHeaderClass = (column: Column<T>) => {
    if (column.pinFirstColumn) return 'dt-v2-col-pinned-first'
    switch (column.type) {
      case 'checkbox': return 'dt-v2-col-checkbox'
      case 'actions': return 'dt-v2-col-actions'
      default: return 'dt-v2-col-scrollable'
    }
  }

  const getColumnCellClass = (column: Column<T>) => {
    if (column.pinFirstColumn) return 'dt-v2-cell-pinned-first'
    switch (column.type) {
      case 'checkbox': return 'dt-v2-cell-checkbox'
      case 'actions': return 'dt-v2-cell-actions'
      default: return 'dt-v2-cell-scrollable'
    }
  }

  // Helper function to get the width for a column
  const getColumnWidth = (column: Column<T>) => {
    // If column has explicit width, use it
    if (column.width) {
      return typeof column.width === 'number' ? `${column.width}px` : column.width
    }
    
    // Otherwise use width config based on column type
    if (column.pinFirstColumn) {
      return typeof widthConfig.pinned === 'number' ? `${widthConfig.pinned}px` : widthConfig.pinned
    }
    
    switch (column.type) {
      case 'checkbox':
        return typeof widthConfig.checkbox === 'number' ? `${widthConfig.checkbox}px` : widthConfig.checkbox
      case 'actions':
        return typeof widthConfig.actions === 'number' ? `${widthConfig.actions}px` : widthConfig.actions
      default:
        return typeof widthConfig.scrollable === 'number' ? `${widthConfig.scrollable}px` : widthConfig.scrollable
    }
  }

  // Helper function to get width for special columns (checkbox, actions)
  const getSpecialColumnWidth = (type: 'checkbox' | 'actions') => {
    const width = widthConfig[type]
    return typeof width === 'number' ? `${width}px` : width
  }

  // Helper function to calculate left position for pinned columns
  const getPinnedLeftPosition = () => {
    if (!showCheckboxes) return '0px'
    return getSpecialColumnWidth('checkbox')
  }

  return (
    <div className="dt-v2-scroll-area">
      <Table className="dt-v2-table">
        <TableHeader className="dt-v2-header">
          <TableRow>
            {/* Checkbox column */}
            {checkboxColumn && (
              <TableHead 
                className="dt-v2-col-checkbox"
                style={{ width: getSpecialColumnWidth('checkbox'), minWidth: getSpecialColumnWidth('checkbox') }}
              >
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}

            {/* Pinned columns */}
            {pinnedColumns.map((column: Column<T>) => (
              <TableHead
                key={column.key}
                className={getColumnHeaderClass(column)}
                style={{ 
                  left: getPinnedLeftPosition(),
                  width: getColumnWidth(column), 
                  minWidth: column.minWidth || getColumnWidth(column) 
                }}
              >
                {column.header}
              </TableHead>
            ))}

            {/* Scrollable columns */}
            {scrollableColumns.map((column: Column<T>) => (
              <TableHead
                key={column.key}
                className={getColumnHeaderClass(column)}
                style={{ width: getColumnWidth(column), minWidth: column.minWidth || getColumnWidth(column) }}
              >
                {column.header}
              </TableHead>
            ))}

            {/* Actions column */}
            {actionsColumn && (
              <TableHead 
                className="dt-v2-col-actions"
                style={{ width: getSpecialColumnWidth('actions'), minWidth: getSpecialColumnWidth('actions') }}
              >
                Actions
              </TableHead>
            )}
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.length > 0 ? (
            data.map((row: T, index: number) => (
              <TableRow
                key={index}
                className="dt-v2-row"
                data-state={isRowSelected(row) ? 'selected' : undefined}
              >
                {/* Checkbox cell */}
                {checkboxColumn && (
                  <TableCell 
                    className="dt-v2-cell-checkbox"
                    style={{ width: getSpecialColumnWidth('checkbox'), minWidth: getSpecialColumnWidth('checkbox') }}
                  >
                    <Checkbox
                      checked={isRowSelected(row)}
                      onCheckedChange={(checked) => handleRowSelect(row, checked as boolean)}
                      aria-label={`Select row ${index + 1}`}
                    />
                  </TableCell>
                )}

                {/* Pinned cells */}
                {pinnedColumns.map((column: Column<T>) => (
                  <TableCell
                    key={column.key}
                    className={getColumnCellClass(column)}
                    style={{ 
                      left: getPinnedLeftPosition(),
                      width: getColumnWidth(column), 
                      minWidth: column.minWidth || getColumnWidth(column) 
                    }}
                  >
                    {getCellValue(row, column)}
                  </TableCell>
                ))}

                {/* Scrollable cells */}
                {scrollableColumns.map((column: Column<T>) => (
                  <TableCell
                    key={column.key}
                    className={getColumnCellClass(column)}
                    style={{ width: getColumnWidth(column), minWidth: column.minWidth || getColumnWidth(column) }}
                  >
                    {getCellValue(row, column)}
                  </TableCell>
                ))}

                {/* Actions cell */}
                {actionsColumn && (
                  <TableCell 
                    className="dt-v2-cell-actions"
                    style={{ width: getSpecialColumnWidth('actions'), minWidth: getSpecialColumnWidth('actions') }}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {actions.map((action: any) => (
                          <DropdownMenuItem
                            key={action.value}
                            onClick={() => onRowAction?.(action.value, row)}
                            className={action.variant === 'destructive' ? 'text-red-600' : ''}
                          >
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={
                  (checkboxColumn ? 1 : 0) +
                  pinnedColumns.length +
                  scrollableColumns.length +
                  (actionsColumn ? 1 : 0)
                }
                className="h-24 text-center"
              >
                No results found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
