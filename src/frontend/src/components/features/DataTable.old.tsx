"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  onRowSelectionChange?: (selectedRows: TData[]) => void
  enableRowSelection?: boolean
  enableColumnVisibility?: boolean
  enableSorting?: boolean
  enableFiltering?: boolean
  enablePagination?: boolean
  pageSize?: number
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  onRowSelectionChange,
  enableRowSelection = true,
  enableColumnVisibility = true,
  enableSorting = true,
  enableFiltering = true,
  enablePagination = true,
  pageSize = 10,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  
  // Column navigation state
  const [visibleColumnStart, setVisibleColumnStart] = React.useState(0)
  const columnsPerPage = 4 // Adjust based on your needs

  // Add selection column if row selection is enabled
  const tableColumns = React.useMemo(() => {
    if (!enableRowSelection) return columns

    const selectionColumn: ColumnDef<TData, TValue> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    }

    return [selectionColumn, ...columns]
  }, [columns, enableRowSelection])

  const table = useReactTable({
    data,
    columns: tableColumns,
    onSortingChange: enableSorting ? setSorting : undefined,
    onColumnFiltersChange: enableFiltering ? setColumnFilters : undefined,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    onColumnVisibilityChange: enableColumnVisibility ? setColumnVisibility : undefined,
    onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
    state: {
      sorting: enableSorting ? sorting : undefined,
      columnFilters: enableFiltering ? columnFilters : undefined,
      columnVisibility: enableColumnVisibility ? columnVisibility : undefined,
      rowSelection: enableRowSelection ? rowSelection : undefined,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  })

  // Get visible columns with navigation logic
  const getVisibleColumns = React.useCallback(() => {
    const allHeaders = table.getHeaderGroups()[0]?.headers || []
    const selectColumn = allHeaders.find(h => h.column.id === 'select')
    const actionsColumn = allHeaders.find(h => h.column.id === 'actions')
    const regularColumns = allHeaders.filter(h => h.column.id !== 'select' && h.column.id !== 'actions')
    
    const visibleRegularColumns = regularColumns.slice(visibleColumnStart, visibleColumnStart + columnsPerPage)
    const needsNavigation = regularColumns.length > columnsPerPage
    const canGoLeft = visibleColumnStart > 0
    const canGoRight = visibleColumnStart + columnsPerPage < regularColumns.length
    
    return {
      selectColumn,
      visibleRegularColumns,
      actionsColumn,
      needsNavigation,
      canGoLeft,
      canGoRight,
      totalRegularColumns: regularColumns.length
    }
  }, [table, visibleColumnStart, columnsPerPage])
  
  const navigateColumns = React.useCallback((direction: 'left' | 'right') => {
    const allHeaders = table.getHeaderGroups()[0]?.headers || []
    const regularColumns = allHeaders.filter(h => h.column.id !== 'select' && h.column.id !== 'actions')
    const totalRegularColumns = regularColumns.length
    
    if (direction === 'left' && visibleColumnStart > 0) {
      setVisibleColumnStart(Math.max(0, visibleColumnStart - 1))
    } else if (direction === 'right' && visibleColumnStart + columnsPerPage < totalRegularColumns) {
      setVisibleColumnStart(Math.min(totalRegularColumns - columnsPerPage, visibleColumnStart + 1))
    }
  }, [table, visibleColumnStart, columnsPerPage])

  // Call the callback when row selection changes
  React.useEffect(() => {
    if (onRowSelectionChange && enableRowSelection) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original)
      onRowSelectionChange(selectedRows)
    }
  }, [rowSelection, onRowSelectionChange, enableRowSelection, table])

  return (
    <div className="w-full space-y-4 pt-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Search */}
        {enableFiltering && searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        )}
        
        {/* Column visibility */}
        {enableColumnVisibility && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Table with Column Pagination */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => {
              const { selectColumn, visibleRegularColumns, actionsColumn, needsNavigation, canGoLeft, canGoRight } = getVisibleColumns()
              
              return (
                <TableRow key={headerGroup.id}>
                  {/* Selection column (sticky left) */}
                  {selectColumn && (
                    <TableHead 
                      className="sticky left-0 bg-background shadow-[2px_0_4px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_rgba(255,255,255,0.1)] z-20"
                      style={{ minWidth: '60px' }}
                    >
                      {flexRender(selectColumn.column.columnDef.header, selectColumn.getContext())}
                    </TableHead>
                  )}
                  
                  {/* Visible regular columns */}
                  {visibleRegularColumns.map((header) => (
                    <TableHead 
                      key={header.id}
                      style={{ minWidth: '150px' }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                  
                  {/* Navigation column (if needed) */}
                  {needsNavigation && (
                    <TableHead className="w-24 text-center" style={{ width: '96px', minWidth: '96px', maxWidth: '96px' }}>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => navigateColumns('left')}
                          disabled={!canGoLeft}
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => navigateColumns('right')}
                          disabled={!canGoRight}
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableHead>
                  )}
                  
                  {/* Actions column (sticky right) */}
                  {actionsColumn && (
                    <TableHead 
                      className="sticky right-0 bg-background shadow-[-2px_0_4px_rgba(0,0,0,0.1)] dark:shadow-[-2px_0_4px_rgba(255,255,255,0.1)] z-20"
                      style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}
                    >
                      {flexRender(actionsColumn.column.columnDef.header, actionsColumn.getContext())}
                    </TableHead>
                  )}
                </TableRow>
              )
            })}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const { needsNavigation } = getVisibleColumns()
                const selectCell = row.getVisibleCells().find(c => c.column.id === 'select')
                const actionsCell = row.getVisibleCells().find(c => c.column.id === 'actions')
                const regularCells = row.getVisibleCells().filter(c => c.column.id !== 'select' && c.column.id !== 'actions')
                const visibleRegularCells = regularCells.slice(visibleColumnStart, visibleColumnStart + columnsPerPage)
                
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    {/* Selection cell (sticky left) */}
                    {selectCell && (
                      <TableCell className="sticky left-0 bg-background shadow-[2px_0_4px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_rgba(255,255,255,0.1)] z-10">
                        {flexRender(selectCell.column.columnDef.cell, selectCell.getContext())}
                      </TableCell>
                    )}
                    
                    {/* Visible regular cells */}
                    {visibleRegularCells.map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                    
                    {/* Navigation cell placeholder */}
                    {needsNavigation && (
                      <TableCell 
                        className="text-center text-muted-foreground" 
                        style={{ width: '96px', minWidth: '96px', maxWidth: '96px' }}
                      >
                        {/* Empty cell for alignment */}
                      </TableCell>
                    )}
                    
                    {/* Actions cell (sticky right) */}
                    {actionsCell && (
                      <TableCell className="sticky right-0 bg-background shadow-[-2px_0_4px_rgba(0,0,0,0.1)] dark:shadow-[-2px_0_4px_rgba(255,255,255,0.1)] z-10">
                        {flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={999} // Large number to span all columns
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {enablePagination && (
        <div className="flex items-center justify-between space-x-2 py-4">
          {enableRowSelection && (
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
          )}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
