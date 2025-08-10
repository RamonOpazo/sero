import { ChevronLeft, ChevronRight } from 'lucide-react'
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
import { useColumnNavigation } from '@/hooks/useColumnNavigation'
import type { Table, Cell } from '@tanstack/react-table'
import './data-table.css'

interface DataTableContentProps<TData> {
  table: Table<TData>
}

export function DataTableContent<TData>({ table }: DataTableContentProps<TData>) {
  const hasSelectColumn = table.getAllColumns().some(c => c.id === 'select')
  const hasActionsColumn = table.getAllColumns().some(c => c.id === 'actions')

  const { 
    containerRef, 
    getVisibleColumns, 
    navigateColumns, 
    animationDirection, 
    getColumnKey 
  } = useColumnNavigation<TData>({ hasSelectColumn, hasActionsColumn })

  const { 
    selectColumn, 
    visibleRegularColumns, 
    actionsColumn, 
    needsNavigation, 
    canGoLeft, 
    canGoRight, 
    adjustedStart 
  } = getVisibleColumns(table)

  const getCellKey = (cell: Cell<TData, unknown>) => {
    return `${cell.id}-${adjustedStart}`
  }

  return (
    <div ref={containerRef} className="mb-4">
      <TableComponent>
        <TableHeader className="bg-muted sticky top-0 z-0">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {selectColumn && (
                <TableHead className="sticky left-0 z-20 text-left pl-[1rem]" style={{maxWidth: "2rem", minWidth: "2rem", width: "2rem"}}>
                  {flexRender(selectColumn.column.columnDef.header, selectColumn.getContext())}
                </TableHead>
              )}

              {visibleRegularColumns.map((header) => (
                <TableHead 
                  key={getColumnKey(header)}
                  className={`w-[8rem] ${animationDirection ? `animate-slide-${animationDirection}` : ''}`}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}

              {(needsNavigation || actionsColumn) && (
                <TableHead className="sticky right-0 z-20 text-right" style={{maxWidth: "4rem", minWidth: "4rem", width: "4rem"}}>
                  {needsNavigation && (
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => navigateColumns(table, 'left')}
                        disabled={!canGoLeft}
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
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
                  )}
                </TableHead>
              )}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const visibleCells = row.getVisibleCells().filter(cell => 
                visibleRegularColumns.some(header => header.id === cell.column.id)
              )

              const selectCell = hasSelectColumn ? row.getVisibleCells().find(c => c.column.id === 'select') : undefined
              const actionsCell = hasActionsColumn ? row.getVisibleCells().find(c => c.column.id === 'actions') : undefined

              return (
                <TableRow
                  key={row.id}
                  data-state={hasSelectColumn && row.getIsSelected() && "selected"}
                  className="hover:bg-muted/50 transition-colors"
                >
                  {selectCell && (
                    <TableCell className="sticky left-0 z-10 text-left pl-[1rem]" style={{maxWidth: "2rem", minWidth: "2rem", width: "2rem"}}>
                      {flexRender(selectCell.column.columnDef.cell, selectCell.getContext())}
                    </TableCell>
                  )}

                  {visibleCells.map((cell) => (
                    <TableCell 
                      key={getCellKey(cell)}
                      className={`w-[8rem] ${animationDirection ? `animate-slide-${animationDirection}` : ''}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}

                  {(needsNavigation || actionsCell) && (
                    <TableCell className="sticky right-0 z-10 text-right" style={{maxWidth: "4rem", minWidth: "4rem", width: "4rem"}}>
                      {actionsCell && (
                        <>
                          {flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}
                        </>
                      )}
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
