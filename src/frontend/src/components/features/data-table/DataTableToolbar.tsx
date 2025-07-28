import { ChevronDown } from 'lucide-react'
import { type Table } from '@tanstack/react-table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Trash2 } from 'lucide-react'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  selection: TData[]
  searchKey?: string
  searchPlaceholder?: string
  onDeleteSelection?: () => void
  onCreateEntries?: () => void
  enableFiltering?: boolean
  enableColumnVisibility?: boolean
  enableDeleteSelection?: boolean
  enableCreateEntries?: boolean
}

export function DataTableToolbar<TData>({
  table,
  selection,
  searchKey,
  searchPlaceholder = 'Search...',
  onDeleteSelection,
  onCreateEntries,
  enableFiltering = true,
  enableColumnVisibility = true,
  enableDeleteSelection = true,
  enableCreateEntries = true,
}: DataTableToolbarProps<TData>)  {
  return (
    <div className="flex items-center gap-2 justify-between">
      {/* Search */}
      {enableFiltering && searchKey && (
        <Input
          placeholder={searchPlaceholder}
          value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn(searchKey)?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      )}

      <div className="flex gap-2 ml-auto">
        {enableDeleteSelection && (
          <Button
            variant="destructive"
            onClick={onDeleteSelection}
            disabled={selection.length === 0}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected ({selection.length})
          </Button>
        )}

        {enableCreateEntries && (
          <Button
            onClick={onCreateEntries}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </Button>
        )}

        {/* Column visibility */}
        {enableColumnVisibility && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      
    </div>
  )
}
