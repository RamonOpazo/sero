import { DataTableToolbar } from './data-table-toolbar'
import { DataTableContent } from './data-table-content'
import { DataTablePagination } from './data-table-pagination'
import { useDataTable, type UseDataTableProps } from './hooks/use-data-table'

// Main DataTable Component
export function DataTable<TData, TValue>(props: UseDataTableProps<TData, TValue>) {
  const {
    columns,
    data,
    selection,
    searchKey,
    searchPlaceholder = 'Search...',
    onRowSelectionChange,
    onDeleteSelection,
    onCreateEntries,
    enableRowSelection = true,
    enableColumnVisibility = true,
    enableSorting = true,
    enableFiltering = true,
    enablePagination = true,
    enableDeleteSelection = true,
    enableCreateEntries = true,
    pageSize = 10,
  } = props

  const { table } = useDataTable({
    columns,
    data,
    selection,
    searchKey,
    searchPlaceholder,
    onRowSelectionChange,
    onDeleteSelection,
    onCreateEntries,
    enableRowSelection,
    enableColumnVisibility,
    enableSorting,
    enableFiltering,
    enablePagination,
    enableDeleteSelection,
    enableCreateEntries,
    pageSize,
  })

  return (
    <div className="w-full space-y-4">
      <DataTableToolbar<TData> 
        table={table}
        selection={selection}
        searchKey={searchKey}
        searchPlaceholder={searchPlaceholder}
        onDeleteSelection={onDeleteSelection}
        onCreateEntries={onCreateEntries}
        enableFiltering={enableFiltering}
        enableColumnVisibility={enableColumnVisibility}
        enableDeleteSelection={enableDeleteSelection}
        enableCreateEntries={enableCreateEntries}
      />
      <DataTableContent<TData> 
        table={table} 
      />
      <DataTablePagination<TData> 
        table={table}
        enableRowSelection={enableRowSelection}
        enablePagination={enablePagination}
      />
    </div>
  )
}

// Export sub-components and utilities
export { DataTableContent } from './data-table-content';
export { DataTablePagination } from './data-table-pagination';
export { DataTableToolbar } from './data-table-toolbar';
export * from './hooks';
export * from './builders';
