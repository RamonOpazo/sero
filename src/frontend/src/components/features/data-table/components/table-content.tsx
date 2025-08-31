import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import type { TableContentProps, Column } from '../types'
import '../data-table.css'

// Header row component
type HeaderRowProps = {
  columns: Column<any>[],
  allSelected: boolean,
  onSelectAll: (checked: boolean) => void,
  showActions?: boolean,
  showCheckboxes?: boolean,
}

function HeaderRow({ columns, allSelected, onSelectAll, showActions, showCheckboxes }: HeaderRowProps) {
  return (
    <TableRow>
      {columns.map((column: Column<any>) => (
        <TableHead
          key={column.key}
          data-table={column.type}
          className={cn(
            typeof column.width === 'number' ? `w-[${column.width}px]` : `w-[${column.width}]`,
          )}
        >
          {column.type === 'checkbox' && (
            <>
              {showCheckboxes && (
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Select all"
                />
              )}
              {column.header}
            </>
          )}

          {column.type === 'scrollable' && (
            column.header
          )}

          {column.type === 'actions' && showActions && (
            column.header
          )}
        </TableHead>
      ))}
    </TableRow>
  )
}

// Body rows component
type BodyRowsProps = {
  data: any[],
  columns: Column<any>[],
  actions: any[],
  isRowSelected: (row: any) => boolean,
  handleRowSelect: (row: any, checked: boolean) => void,
  showActions?: boolean,
  showCheckboxes?: boolean,
  onRowAction?: (action: string, row: any) => void,
  getCellValue: (row: any, column: Column<any>) => any,
}

function BodyRows({
  data,
  columns,
  isRowSelected,
  handleRowSelect,
  showActions,
  showCheckboxes,
  getCellValue,
}: BodyRowsProps) {
  return (
    <>
      {data.map((row: any, index: number) => (
        <TableRow
          key={(row as any)?.id ?? `row-${index}`}
          data-state={isRowSelected(row) ? 'selected' : undefined}
        >
          {columns.map((column: Column<any>) => (
            <TableCell
              key={column.key}
              data-table={column.type}
              className={cn(
                typeof column.width === 'number' ? `w-[${column.width}px]` : `w-[${column.width}]`,
              )}
            >
              {column.type === 'scrollable' && (
                getCellValue(row, column)
              )}

              {column.type === 'checkbox' && (
                <>
                  {showCheckboxes && (
                    <Checkbox
                      checked={isRowSelected(row)}
                      onCheckedChange={(checked) => handleRowSelect(row, checked as boolean)}
                      aria-label={`Select row ${index + 1}`}
                    />
                  )}
                  {getCellValue(row, column)}
                </>
              )}

              {column.type === "actions" && showActions && (
                getCellValue(row, column)
              )}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export function TableContent<T extends Record<string, any>>({
  data,
  columns,
  selectedRows = [],
  showActions = false,
  showCheckboxes = false,
  onRowSelect,
  onRowAction,
  actions = [],
}: TableContentProps<T>) {
  const [allSelected, setAllSelected] = useState(false)

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

  return (
    <div data-table="content">
      <Table data-table="table">

        <TableHeader className="data-table-header">
          <HeaderRow
            columns={columns as Column<any>[]}
            allSelected={allSelected}
            onSelectAll={handleSelectAll}
            showActions={showActions}
            showCheckboxes={showCheckboxes}
          />
        </TableHeader>

        <TableBody>
          <BodyRows
            data={data as any[]}
            columns={columns as Column<any>[]}
            actions={actions}
            isRowSelected={isRowSelected as any}
            handleRowSelect={handleRowSelect as any}
            showActions={showActions}
            showCheckboxes={showCheckboxes}
            onRowAction={onRowAction as any}
            getCellValue={getCellValue as any}
          />
        </TableBody>

      </Table>
    </div>
  )
}
