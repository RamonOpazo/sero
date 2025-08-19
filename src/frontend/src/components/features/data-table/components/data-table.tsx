import { cn } from '@/lib/utils'
import { TableToolbar } from './table-toolbar'
import { TableContent } from './table-content'
import type { DataTableProps } from '../types'
import '../data-table.css'

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  searchPlaceholder,
  onSearch,
  onRowSelect,
  onRowAction,
  showCheckboxes = false,
  showActions = false,
  searchValue,
  selectedRows,
  actions = [
    { label: 'Edit', value: 'edit' },
    { label: 'View', value: 'view' },
    { label: 'Delete', value: 'delete', variant: 'destructive' as const }
  ],
  filters,
  onAddNew,
  addNewLabel,
  className,
  columnWidths
}: DataTableProps<T>) {
  return (
    <div className={cn('dt-v2-container', className)}>
      {/* Toolbar */}
      {(title || onSearch || filters || onAddNew) && (
        <TableToolbar
          title={title}
          searchPlaceholder={searchPlaceholder}
          searchValue={searchValue}
          onSearch={onSearch}
          filters={filters}
          onAddNew={onAddNew}
          addNewLabel={addNewLabel}
        />
      )}

      {/* Table Content */}
      <div className="dt-v2-content">
        <TableContent
          data={data}
          columns={columns}
          selectedRows={selectedRows}
          onRowSelect={onRowSelect}
          onRowAction={onRowAction}
          showCheckboxes={showCheckboxes}
          showActions={showActions}
          actions={actions}
          columnWidths={columnWidths}
        />
      </div>
    </div>
  )
}
