import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type Table } from '@tanstack/react-table'
import { flexRender } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
// import { Separator } from '@/components/ui/separator'
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
    <div className="rounded-md border overflow-hidden">
      <TableComponent>
        <TableHeader className="bg-muted sticky top-0 z-0">
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
                  <TableHead className="sticky left-0 z-20 w-[2rem] text-center">
                    {flexRender(selectColumn.column.columnDef.header, selectColumn.getContext())}
                  </TableHead>
                )}

                {/* Visible regular columns */}
                {visibleRegularColumns.map((header) => (
                  <TableHead key={header.id} className="min-w-[4rem]">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}

                {/* Navigation column (if needed) */}
                {(needsNavigation || actionsColumn) && (
                  <TableHead className="w-[4-rem] text-center">
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
                    <TableCell className="sticky left-0 z-10 w-[2rem] text-center">
                      {flexRender(selectCell.column.columnDef.cell, selectCell.getContext())}
                    </TableCell>
                  )}

                  {/* Visible regular cells */}
                  {visibleRegularCells.map((cell) => (
                    <TableCell key={cell.id} className="min-w-[4rem]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}

                  {/* Navigation cell placeholder */}
                  {(needsNavigation || actionsCell) && (
                    <TableCell className="sticky right-0 z-10 w-[2rem] text-center">
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
