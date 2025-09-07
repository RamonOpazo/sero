import { TableToolbar } from './table-toolbar'
import { TableContent } from './table-content'
import { TablePagination } from './table-pagination'
import { adaptColumns } from '../columns/adapter'
import { defineColumnsConfig } from '../columns/simple'
import type { DataTableProps, Column } from '../types'
import '../data-table.css'

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  columnDefs,
  title,
  searchPlaceholder,
  onSearch,
  onRowSelect,
  onRowAction,
  showCheckboxes = false,
  showActions = false,
  searchValue,
  selectedRows,
  actions,
  filters,
  onAddNew,
  addNewLabel,
  className,
  columnWidths,
  searchColumns,
  selectedSearchColumn,
  onSearchColumnChange,
  tableColumns,
  visibleColumns,
  onColumnVisibilityChange,
  customButtons,
  pagination
}: DataTableProps<T>) {
  const totalItems = pagination?.totalItems ?? data.length
  const showPagination = pagination?.showPagination ?? false
  const selectedCount = selectedRows?.length ?? 0

  // Normalize columns: prefer legacy if provided, otherwise adapt from simple column defs
  const effectiveColumns: Column<T>[] = (() => {
    if (columns && columns.length) return columns
    if (columnDefs && columnDefs.length) {
      const configs = defineColumnsConfig<T>(columnDefs)
      return adaptColumns<T>(configs)
    }
    return []
  })()

  return (
    <div
      data-table="container"
      className={className}
    >

      {/* Toolbar */}
      {(title || onSearch || filters || onAddNew || searchColumns || tableColumns || customButtons) && (
        <TableToolbar
          title={title}
          searchPlaceholder={searchPlaceholder}
          searchValue={searchValue}
          onSearch={onSearch}
          filters={filters}
          onAddNew={onAddNew}
          addNewLabel={addNewLabel}
          searchColumns={searchColumns}
          selectedSearchColumn={selectedSearchColumn}
          onSearchColumnChange={onSearchColumnChange}
          columns={tableColumns}
          visibleColumns={visibleColumns}
          onColumnVisibilityChange={onColumnVisibilityChange}
          customButtons={customButtons}
        />
      )}

      {/* Table Content */}
      <TableContent
        data={data}
        columns={effectiveColumns}
        selectedRows={selectedRows}
        onRowSelect={onRowSelect}
        onRowAction={onRowAction}
        showCheckboxes={showCheckboxes}
        showActions={showActions}
        actions={actions}
        columnWidths={columnWidths}
      />
      
      {/* Pagination */}
      {pagination && (
        <TablePagination
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          totalItems={totalItems}
          selectedCount={selectedCount}
          showSelection={showCheckboxes}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          pageSizeOptions={pagination.pageSizeOptions}
          showPagination={showPagination}
        />
      )}

    </div>
  )
}
