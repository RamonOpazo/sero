import { useRef } from 'react'
import { flexRender } from '@tanstack/react-table'
import {
  Table as TableComponent,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { HiddenColumnsDisplay } from './hidden-columns-display'
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
  
  // Get all columns and cast them to extended columns
  const allColumns = table.getAllColumns().map(col => col.columnDef) as ExtendedColumnDef[]
  
  // Use responsive column management
  const { visibleColumns, hiddenColumns, isResponsive } = useResponsiveColumns({
    columns: allColumns,
    containerRef,
    minTableWidth
  })

  // Find special columns
  const hasSelectColumn = visibleColumns.some(col => col.id === 'select')
  const hasActionsColumn = visibleColumns.some(col => col.id === 'actions') || 
                          allColumns.some(col => col.id === 'actions')

  // Filter table columns to only show visible ones
  const visibleColumnIds = new Set(visibleColumns.map(col => col.id))
  
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
                        ${isActionsColumn ? 'sticky right-0 z-20 w-[4rem] min-w-[4rem] max-w-[4rem] text-right' : ''}
                        ${!isSelectColumn && !isActionsColumn ? 'w-[8rem]' : ''}
                      `}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
                
                {/* Add hidden columns indicator if we have hidden columns but no actions column */}
                {isResponsive && !hasActionsColumn && hiddenColumns.length > 0 && (
                  <TableHead className="sticky right-0 z-20 w-[4rem] min-w-[4rem] max-w-[4rem] text-right">
                    More
                  </TableHead>
                )}
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
                  data-state={hasSelectColumn && row.getIsSelected() && "selected"}
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
                          ${isActionsColumn ? 'sticky right-0 z-10 w-[4rem] min-w-[4rem] max-w-[4rem] text-right' : ''}
                          ${!isSelectColumn && !isActionsColumn ? 'w-[8rem]' : ''}
                        `}
                      >
                        <div className="flex items-center gap-2">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          
                          {/* Add hidden columns display to actions column */}
                          {isActionsColumn && isResponsive && hiddenColumns.length > 0 && (
                            <HiddenColumnsDisplay 
                              hiddenColumns={hiddenColumns}
                              rowData={row.original}
                            />
                          )}
                        </div>
                      </TableCell>
                    )
                  })}
                  
                  {/* Add hidden columns indicator if we have hidden columns but no actions column */}
                  {isResponsive && !hasActionsColumn && hiddenColumns.length > 0 && (
                    <TableCell className="sticky right-0 z-10 w-[4rem] min-w-[4rem] max-w-[4rem] text-right">
                      <HiddenColumnsDisplay 
                        hiddenColumns={hiddenColumns}
                        rowData={row.original}
                      />
                    </TableCell>
                  )}
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={visibleColumns.length + (isResponsive && !hasActionsColumn && hiddenColumns.length > 0 ? 1 : 0)}
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
