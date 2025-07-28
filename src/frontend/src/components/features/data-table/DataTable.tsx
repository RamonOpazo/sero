import { DataTableToolbar } from './DataTableToolbar'
import { DataTableContent } from './DataTableContent'
import { DataTablePagination } from './DataTablePagination'
import { useDataTable, type UseDataTableProps } from './hooks/useDataTable'

export function DataTable<TData, TValue>(props: UseDataTableProps<TData, TValue>) {
  const {
    columns,
    data,
    searchKey,
    searchPlaceholder = 'Search...',
    onRowSelectionChange,
    enableRowSelection = true,
    enableColumnVisibility = true,
    enableSorting = true,
    enableFiltering = true,
    enablePagination = true,
    pageSize = 10,
  } = props

  const { table } = useDataTable({
    columns,
    data,
    searchKey,
    searchPlaceholder,
    onRowSelectionChange,
    enableRowSelection,
    enableColumnVisibility,
    enableSorting,
    enableFiltering,
    enablePagination,
    pageSize,
  })

  return (
    <div className="w-full space-y-4">
      <DataTableToolbar<TData> 
        table={table} 
        searchKey={searchKey}
        searchPlaceholder={searchPlaceholder}
        enableFiltering={enableFiltering}
        enableColumnVisibility={enableColumnVisibility}
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
