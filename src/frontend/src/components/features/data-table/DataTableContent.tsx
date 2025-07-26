import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { type Table } from '@tanstack/react-table'
import { flexRender } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  Table as TableComponent,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useColumnNavigation } from './hooks/useColumnNavigation'

interface DataTableContentProps<TData> {
  table: Table<TData>
}

export function DataTableContent<TData>({ table }: DataTableContentProps<TData>) {
  const { getVisibleColumns, navigateColumns } = useColumnNavigation<TData>()

  return (
    <div className="rounded-md border">
      <TableComponent>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => {
            const { 
              selectColumn, 
              visibleRegularColumns, 
              actionsColumn, 
              needsNavigation, 
              canGoLeft, 
              canGoRight 
            } = getVisibleColumns(table)
            
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
                        onClick={() => navigateColumns(table, 'left')}
                        disabled={!canGoLeft}
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => navigateColumns(table, 'right')}
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
              const { needsNavigation, visibleColumnStart, columnsPerPage } = getVisibleColumns(table)
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
      </TableComponent>
    </div>
  )
}
