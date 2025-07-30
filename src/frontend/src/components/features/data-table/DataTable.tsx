import { DataTableToolbar } from './DataTableToolbar'
import { DataTableContent } from './DataTableContent'
import { DataTablePagination } from './DataTablePagination'
import { useDataTable, type UseDataTableProps } from '@/hooks/useDataTable'

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
