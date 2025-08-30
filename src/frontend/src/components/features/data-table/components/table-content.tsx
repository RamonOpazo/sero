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

  // Separate columns by type first (needed for width calculations)
  const pinnedColumns = columns.filter((col: Column<T>) => col.pinFirstColumn === true)

  // CSS variables for consistent sticky positioning
  // Calculate combined width for checkbox + first column when both are present
  const getCombinedLeftColWidth = () => {
    const checkboxWidth = typeof widthConfig.checkbox === 'number' ? widthConfig.checkbox : parseInt(widthConfig.checkbox.replace(/[^\d]/g, ''))
    const pinnedWidth = typeof widthConfig.pinned === 'number' ? widthConfig.pinned : parseInt(widthConfig.pinned.replace(/[^\d]/g, ''))

    if (showCheckboxes && pinnedColumns.length > 0) {
      return `${checkboxWidth + pinnedWidth}px`
    } else if (showCheckboxes) {
      return typeof widthConfig.checkbox === 'number' ? `${widthConfig.checkbox}px` : widthConfig.checkbox
    } else if (pinnedColumns.length > 0) {
      return typeof widthConfig.pinned === 'number' ? `${widthConfig.pinned}px` : widthConfig.pinned
    }
    return '0px'
  }

  const stickyVars = {
    "--combined-left-col": getCombinedLeftColWidth(),
    "--actions-col": typeof widthConfig.actions === 'number' ? `${widthConfig.actions}px` : widthConfig.actions,
  } as React.CSSProperties


  // Helper function to get cell value
  const getCellValue = (row: T, column: Column<T>) => {

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
  const scrollableColumns = columns.filter((col: Column<T>) =>
    !col.pinFirstColumn && (col.type === 'scrollable' || col.type === 'actions' || !col.type)
  )
  // Check if we have any actions columns in our column definitions
  const hasActionsColumn = columns.some((col: Column<T>) => col.type === 'actions')
  const actionsColumn = showActions && !hasActionsColumn // Only show legacy actions if no actions column exists

  // // Helper function to get CSS class based on column type
  // const getColumnHeaderClass = (column: Column<T>) => {
  //   switch (column.type) {
  //     case 'actions': return 'data-table-col-actions'
  //     default: return '' // Use inline Tailwind classes instead
  //   }
  // }

  // const getColumnCellClass = (column: Column<T>) => {
  //   switch (column.type) {
  //     case 'actions': return 'data-table-cell-actions'
  //     default: return '' // Use inline Tailwind classes instead
  //   }
  // }

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


  return (
    <div className="data-table-scroll-area" style={stickyVars}>
      <Table>
        <TableHeader>
          <TableRow>
            {/* Combined checkbox + first column */}
            {(checkboxColumn || pinnedColumns.length > 0) && (
              <TableHead role="checkbox" className="sticky left-0 z-40">
                <div className="flex items-center gap-2">
                  {checkboxColumn && (
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                      className="mx-2"
                    />
                  )}
                  {pinnedColumns.length > 0 && (
                    <div className="flex-1 font-medium">
                      {pinnedColumns[0]?.header}
                    </div>
                  )}
                </div>
              </TableHead>
            )}

            {/* Scrollable columns */}
            {scrollableColumns.map((column: Column<T>) => (
              <TableHead
                key={column.key}
                // className={getColumnHeaderClass(column)}
                style={{ width: getColumnWidth(column), minWidth: column.minWidth || getColumnWidth(column) }}
              >
                {column.header}
              </TableHead>
            ))}

            {/* Actions column */}
            {actionsColumn && (
              <TableHead className="data-table-col-actions">
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
                className="data-table-row"
                data-state={isRowSelected(row) ? 'selected' : undefined}
              >
                {/* Combined checkbox + first column cell */}
                {(checkboxColumn || pinnedColumns.length > 0) && (
                  <TableCell className="sticky left-0 z-30 w-[var(--combined-left-col)] min-w-[var(--combined-left-col)] data-table-cell-pinned">
                    <div className="flex items-center gap-2">
                      {checkboxColumn && (
                        <Checkbox
                          checked={isRowSelected(row)}
                          onCheckedChange={(checked) => handleRowSelect(row, checked as boolean)}
                          aria-label={`Select row ${index + 1}`}
                          className="mx-2"
                        />
                      )}
                      {pinnedColumns.length > 0 && (
                        <div className="flex-1 font-medium">
                          {getCellValue(row, pinnedColumns[0])}
                        </div>
                      )}
                    </div>
                  </TableCell>
                )}

                {/* Scrollable cells */}
                {scrollableColumns.map((column: Column<T>) => (
                  <TableCell
                    key={column.key}
                    // className={getColumnCellClass(column)}
                    style={{ width: getColumnWidth(column), minWidth: column.minWidth || getColumnWidth(column) }}
                  >
                    {getCellValue(row, column)}
                  </TableCell>
                ))}

                {/* Actions cell */}
                {actionsColumn && (
                  <TableCell className="data-table-cell-actions">
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
                  ((checkboxColumn || pinnedColumns.length > 0) ? 1 : 0) +
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
