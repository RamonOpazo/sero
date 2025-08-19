import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'
import type { TableToolbarProps } from '../types'
import '../data-table.css'

export function TableToolbar({
  title,
  searchPlaceholder = 'Search...',
  searchValue,
  onSearch,
  filters,
  onAddNew,
  addNewLabel = 'Add New'
}: TableToolbarProps) {
  return (
    <div className="dt-v2-toolbar">
      {title && (
        <h2 className="dt-v2-toolbar-title">
          {title}
        </h2>
      )}
      <div className="dt-v2-toolbar-controls">
        {onSearch && (
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
            className="dt-v2-search-input"
          />
        )}
        
        {filters?.map((filter: any) => (
          <Select
            key={filter.key}
            value={filter.value}
            onValueChange={filter.onChange}
          >
            <SelectTrigger className="dt-v2-filter-select">
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
        
        {onAddNew && (
          <Button onClick={onAddNew} className="dt-v2-add-button">
            <Plus className="mr-2 h-4 w-4" />
            {addNewLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
