import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, Columns, ChevronDown } from 'lucide-react'
import type { TableToolbarProps } from '../types'
import '../data-table.css'

export function TableToolbar({
  title,
  searchPlaceholder = 'Search...',
  searchValue,
  onSearch,
  filters,
  onAddNew,
  addNewLabel = 'Add New',
  searchColumns = [],
  selectedSearchColumn,
  onSearchColumnChange,
  columns = [],
  visibleColumns = [],
  onColumnVisibilityChange,
  customButtons = []
}: TableToolbarProps) {
  return (
    <div className="data-table-toolbar">
      {title && (
        <h2 className="data-table-toolbar-title">
          {title}
        </h2>
      )}
      <div className="data-table-toolbar-controls">
        {onSearch && (
          <div className="flex gap-2">
            {/* Advanced Search Box */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearch(e.target.value)}
                className="pl-10 data-table-search-input"
              />
            </div>
            
            {/* Search Column Selector */}
            {searchColumns.length > 0 && (
              <Select
                value={selectedSearchColumn}
                onValueChange={onSearchColumnChange}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Search in..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All columns</SelectItem>
                  {searchColumns.map((column) => (
                    <SelectItem key={column.key} value={column.key}>
                      {column.header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
        
        {filters?.map((filter: any) => (
          <Select
            key={filter.key}
            value={filter.value}
            onValueChange={filter.onChange}
          >
            <SelectTrigger className="data-table-filter-select">
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              {filter.options.map((option: any) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        
        {/* Column Visibility Selector */}
        {columns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                <Columns className="mr-2 h-4 w-4" />
                Columns
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  className="capitalize"
                  checked={visibleColumns.includes(column.key)}
                  onCheckedChange={(checked) => 
                    onColumnVisibilityChange?.(column.key, checked)
                  }
                >
                  {column.header}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        {/* Custom Action Buttons */}
        {customButtons.map((button, index) => (
          <Button
            key={index}
            onClick={button.onClick}
            variant={button.variant || 'outline'}
            size={button.size || 'default'}
            className={button.className}
            disabled={button.disabled}
          >
            {button.icon && <button.icon className="mr-2 h-4 w-4" />}
            {button.label}
          </Button>
        ))}
        
        {onAddNew && (
          <Button onClick={onAddNew} className="data-table-add-button">
            <Plus className="mr-2 h-4 w-4" />
            {addNewLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
