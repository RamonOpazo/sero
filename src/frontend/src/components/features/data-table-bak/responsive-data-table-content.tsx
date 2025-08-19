import { useRef } from 'react'
import { flexRender } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Table as TableComponent,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useResponsiveColumns, type ExtendedColumnDef } from './hooks/use-responsive-columns'
import type { Table } from '@tanstack/react-table'
import "./data-table.css"

interface ResponsiveDataTableContentProps<TData> {
  table: Table<TData>
  minTableWidth?: number
}

export function ResponsiveDataTableContent<TData>({ 
  table, 
  minTableWidth = 800 
}: ResponsiveDataTableContentProps<TData>) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Get all columns and enhance them with responsive metadata
  const allColumns: ExtendedColumnDef[] = table.getAllColumns().map(col => {
    const columnDef = col.columnDef as ExtendedColumnDef
    
    // Add default responsive metadata for special columns if not already set
    if (!columnDef.responsive) {
      if (columnDef.id === 'select') {
        columnDef.responsive = {
          pinned: 'left',
          priority: -2,
          minWidth: 50
        }
      } else if (columnDef.id === 'actions') {
        columnDef.responsive = {
          pinned: 'right',
          priority: -1,
          minWidth: 80
        }
      } else {
        // Default responsive metadata for columns without it
        columnDef.responsive = {
          priority: 999,
          minWidth: 150,
          pinned: false
        }
      }
    }
    
    return columnDef
  })
  
  // Use responsive column management
  const {
    leftPinnedColumns,
    rightPinnedColumns,
    visibleScrollableColumns,
    canScrollLeft,
    canScrollRight,
    scrollLeft,
    scrollRight,
    needsNavigation
  } = useResponsiveColumns({
    columns: allColumns,
    containerRef,
    minTableWidth
  })

  // Combine all visible columns in order
  const allVisibleColumns = [...leftPinnedColumns, ...visibleScrollableColumns, ...rightPinnedColumns]
  
  // Filter table columns to only show visible ones
  const visibleColumnIds = new Set(allVisibleColumns.map(col => col.id))
  
  return (
    <div ref={containerRef} className="mb-4 overflow-x-auto">
      <TableComponent>
        <TableHeader className="bg-muted sticky top-0 z-0">
          {table.getHeaderGroups().map((headerGroup) => {
            // Filter headers to only show visible columns
            const visibleHeaders = headerGroup.headers.filter(header => 
              visibleColumnIds.has(header.column.id)
            )
            
            return (
              <TableRow key={headerGroup.id}>
                {visibleHeaders.map((header) => {
                  const isSelectColumn = header.column.id === 'select'
                  const isActionsColumn = header.column.id === 'actions'
                  
                  return (
                    <TableHead 
                      key={header.id}
                      className={`
                        ${isSelectColumn ? 'sticky left-0 z-20 w-[2rem] min-w-[2rem] max-w-[2rem]' : ''}
                        ${isActionsColumn ? 'sticky right-0 z-20 w-[6rem] min-w-[6rem] max-w-[6rem] text-right' : ''}
                        ${!isSelectColumn && !isActionsColumn ? 'w-[8rem]' : ''}
                      `}
                    >
                      {isActionsColumn && needsNavigation ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={scrollLeft}
                            disabled={!canScrollLeft}
                            title="Previous columns"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={scrollRight}
                            disabled={!canScrollRight}
                            title="Next columns"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
                
              </TableRow>
            )
          })}
        </TableHeader>
        
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              // Filter cells to only show visible columns
              const visibleCells = row.getVisibleCells().filter(cell => 
                visibleColumnIds.has(cell.column.id)
              )
              
              return (
                <TableRow
                  key={row.id}
                  data-state={leftPinnedColumns.some(col => col.id === 'select') && row.getIsSelected() && "selected"}
                  className="hover:bg-muted/50 transition-colors"
                >
                  {visibleCells.map((cell) => {
                    const isSelectColumn = cell.column.id === 'select'
                    const isActionsColumn = cell.column.id === 'actions'
                    
                    return (
                      <TableCell 
                        key={cell.id}
                        className={`
                          ${isSelectColumn ? 'sticky left-0 z-10 w-[2rem] min-w-[2rem] max-w-[2rem]' : ''}
                          ${isActionsColumn ? 'sticky right-0 z-10 w-[6rem] min-w-[6rem] max-w-[6rem] text-right' : ''}
                          ${!isSelectColumn && !isActionsColumn ? 'w-[8rem]' : ''}
                        `}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    )
                  })}
                  
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={allVisibleColumns.length}
                className="h-24 text-center"
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </TableComponent>
    </div>
  )
}
