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
import { Plus, Search, Columns3, ChevronDown } from 'lucide-react'
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
        {/* Left side - Search and Filters */}
        <div className="flex items-center gap-2">
          {onSearch && (
            <div className="flex items-center gap-2">
              {/* Advanced Search Box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearch(e.target.value)}
                  className="pl-10 w-[250px] lg:w-[300px]"
                />
              </div>
              
              {/* Search Column Selector */}
              {searchColumns.length > 0 && (
                <Select
                  value={selectedSearchColumn}
                  onValueChange={onSearchColumnChange}
                >
                  <SelectTrigger className="w-[120px] lg:w-[150px]">
                    <SelectValue placeholder="All" />
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
          
          {/* Filters */}
          {filters?.map((filter: any) => (
            <Select
              key={filter.key}
              value={filter.value}
              onValueChange={filter.onChange}
            >
              <SelectTrigger className="w-[120px] lg:w-[150px]">
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
        </div>
        
        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Column Visibility Selector */}
          {columns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns3 className="h-4 w-4" />
                  <span className="hidden lg:inline ml-2">Customize Columns</span>
                  <span className="lg:hidden ml-2">Columns</span>
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
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
              size="sm"
              className={button.className}
              disabled={button.disabled}
            >
              {button.icon && <button.icon className="h-4 w-4" />}
              <span className="hidden lg:inline ml-2">{button.label}</span>
              <span className="lg:hidden ml-2">
                {button.label.split(' ')[0]} {/* Show first word on mobile */}
              </span>
            </Button>
          ))}
          
          {onAddNew && (
            <Button onClick={onAddNew} size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden lg:inline ml-2">{addNewLabel}</span>
              <span className="lg:hidden ml-2">Add</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
