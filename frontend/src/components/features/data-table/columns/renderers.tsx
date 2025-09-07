import { type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Check, X } from 'lucide-react'
import type {
  ColumnConfig,
  TextColumnConfig,
  NumberColumnConfig,
  DateColumnConfig,
  BooleanColumnConfig,
  BadgeColumnConfig,
  StatusColumnConfig,
  ActionsColumnConfig,
  SelectColumnConfig,
  CustomColumnConfig,
} from '../types/column-config'

// Utility function for date formatting
const formatDate = (dateString: string | Date, format?: { style?: 'relative' | 'absolute' | 'custom', pattern?: string, locale?: string }) => {
  if (!dateString) return "-"
  
  try {
    const date = new Date(dateString)
    const now = new Date()
    
    if (format?.style === 'absolute') {
      return date.toLocaleDateString(format.locale || 'en-US')
    }
    
    if (format?.style === 'custom' && format.pattern) {
      // Simple custom formatting - could be extended with a proper date library
      return date.toLocaleDateString(format.locale || 'en-US')
    }
    
    // Default: relative formatting
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  } catch {
    return 'Unknown'
  }
}

// Utility function for number formatting
const formatNumber = (value: number, format?: { decimals?: number, prefix?: string, suffix?: string, thousands?: string, locale?: string }) => {
  if (typeof value !== 'number' || isNaN(value)) return '0'
  
  let formatted = value.toFixed(format?.decimals ?? 0)
  
  if (format?.thousands) {
    formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, format.thousands)
  }
  
  if (format?.prefix) {
    formatted = format.prefix + formatted
  }
  
  if (format?.suffix) {
    formatted = formatted + format.suffix
  }
  
  return formatted
}

// Text column renderer
export function renderTextCell<TData>(
  value: string,
  row: TData,
  index: number,
  config: TextColumnConfig<TData>
): ReactNode {
  if (config.cell) {
    return config.cell(value, row, index)
  }
  
  let displayValue = value || config.placeholder || ''
  
  // Apply text transformation
  if (config.transform) {
    switch (config.transform) {
      case 'uppercase':
        displayValue = displayValue.toUpperCase()
        break
      case 'lowercase':
        displayValue = displayValue.toLowerCase()
        break
      case 'capitalize':
        displayValue = displayValue.charAt(0).toUpperCase() + displayValue.slice(1)
        break
    }
  }
  
  // Apply truncation
  if (config.maxLength && displayValue.length > config.maxLength) {
    displayValue = displayValue.slice(0, config.maxLength) + '...'
  }
  
  return (
    <div 
      className={`text-${config.align || 'left'} ${config.className || ''}`}
      title={value !== displayValue ? value : undefined}
    >
      {displayValue}
    </div>
  )
}

// Number column renderer
export function renderNumberCell<TData>(
  value: number,
  row: TData,
  index: number,
  config: NumberColumnConfig<TData>
): ReactNode {
  if (config.cell) {
    return config.cell(value, row, index)
  }
  
  const formattedValue = formatNumber(value, config.format)
  
  return (
    <div className={`text-${config.align || 'right'} font-mono ${config.className || ''}`}>
      {formattedValue}
    </div>
  )
}

// Date column renderer
export function renderDateCell<TData>(
  value: string | Date,
  row: TData,
  index: number,
  config: DateColumnConfig<TData>
): ReactNode {
  if (config.cell) {
    return config.cell(value, row, index)
  }
  
  const formattedDate = formatDate(value, config.format)
  
  return (
    <div className={`text-${config.align || 'left'} text-muted-foreground text-sm ${config.className || ''}`}>
      {formattedDate}
    </div>
  )
}

// Boolean column renderer
export function renderBooleanCell<TData>(
  value: boolean,
  row: TData,
  index: number,
  config: BooleanColumnConfig<TData>
): ReactNode {
  if (config.cell) {
    return config.cell(value, row, index)
  }
  
  if (config.display) {
    return (
      <div className={`text-${config.align || 'center'} ${config.className || ''}`}>
        {value ? config.display.true : config.display.false}
      </div>
    )
  }
  
  // Default display with icons
  return (
    <div className={`text-${config.align || 'center'} ${config.className || ''}`}>
      {value ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <X className="h-4 w-4 text-red-600" />
      )}
    </div>
  )
}

// Badge column renderer
export function renderBadgeCell<TData>(
  value: string | number,
  row: TData,
  index: number,
  config: BadgeColumnConfig<TData>
): ReactNode {
  if (config.cell) {
    return config.cell(value, row, index)
  }
  
  const displayValue = value?.toString() || '0'
  const customColor = config.colorMap?.[displayValue]
  
  return (
    <div className={`text-${config.align || 'left'} ${config.className || ''}`}>
      <Badge 
        variant={config.variant || 'secondary'}
        className={customColor ? customColor : undefined}
      >
        {displayValue}
      </Badge>
    </div>
  )
}

// Status column renderer
export function renderStatusCell<TData>(
  value: string,
  row: TData,
  index: number,
  config: StatusColumnConfig<TData>
): ReactNode {
  if (config.cell) {
    return config.cell(value, row, index)
  }
  
  const statusConfig = config.statusMap?.[value]
  const displayLabel = statusConfig?.label || value?.charAt(0).toUpperCase() + value?.slice(1).replace('_', ' ') || 'Unknown'
  const variant = statusConfig?.variant || 'outline'
  const IconComponent = statusConfig?.icon
  
  return (
    <div className={`text-${config.align || 'left'} ${config.className || ''}`}>
      <Badge variant={variant} className={statusConfig?.color}>
        {IconComponent && <IconComponent className="h-3 w-3 mr-1" />}
        {displayLabel}
      </Badge>
    </div>
  )
}

// Actions column renderer
export function renderActionsCell<TData>(
  value: any,
  row: TData,
  index: number,
  config: ActionsColumnConfig<TData>
): ReactNode {
  if (config.cell) {
    return config.cell(value, row, index)
  }
  
  const visibleActions = config.actions.filter(action => !action.hidden?.(row))
  
  if (visibleActions.length === 0) {
    return null
  }
  
  return (
    <div className={`text-${config.align || 'center'} ${config.className || ''}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {visibleActions.map((action, actionIndex) => {
            if (action.id === 'separator') {
              return <DropdownMenuSeparator key={actionIndex} />
            }
            
            const isDisabled = action.disabled?.(row)
            const IconComponent = action.icon
            
            return (
              <DropdownMenuItem
                key={action.id}
                onClick={() => !isDisabled && action.onClick(row)}
                disabled={isDisabled}
                className={action.variant === 'destructive' ? 'text-destructive' : ''}
              >
                {IconComponent && <IconComponent className="h-4 w-4 mr-2" />}
                {action.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// Select column renderer
export function renderSelectCell<TData>(
  value: boolean,
  row: TData,
  index: number,
  config: SelectColumnConfig<TData>,
  isSelected: boolean = false,
  onSelectionChange?: (selected: boolean) => void
): ReactNode {
  if (config.cell) {
    return config.cell(value, row, index)
  }
  
  return (
    <div className={`text-${config.align || 'center'} ${config.className || ''}`}>
      <Checkbox
        checked={isSelected}
        onCheckedChange={onSelectionChange}
        aria-label={`Select row ${index + 1}`}
      />
    </div>
  )
}

// Custom column renderer
export function renderCustomCell<TData, TValue>(
  value: TValue,
  row: TData,
  index: number,
  config: CustomColumnConfig<TData, TValue>
): ReactNode {
  return config.render(value, row, index)
}

// Main cell renderer that routes to appropriate sub-renderer
export function renderCell<TData>(
  value: any,
  row: TData,
  index: number,
  config: ColumnConfig<TData>,
  additionalProps?: any
): ReactNode {
  switch (config.type) {
    case 'text':
      return renderTextCell(value, row, index, config as TextColumnConfig<TData>)
    case 'number':
      return renderNumberCell(value, row, index, config as NumberColumnConfig<TData>)
    case 'date':
      return renderDateCell(value, row, index, config as DateColumnConfig<TData>)
    case 'boolean':
      return renderBooleanCell(value, row, index, config as BooleanColumnConfig<TData>)
    case 'badge':
      return renderBadgeCell(value, row, index, config as BadgeColumnConfig<TData>)
    case 'status':
      return renderStatusCell(value, row, index, config as StatusColumnConfig<TData>)
    case 'actions':
      return renderActionsCell(value, row, index, config as ActionsColumnConfig<TData>)
    case 'select':
      return renderSelectCell(
        value, 
        row, 
        index, 
        config as SelectColumnConfig<TData>,
        additionalProps?.isSelected,
        additionalProps?.onSelectionChange
      )
    case 'custom':
      return renderCustomCell(value, row, index, config as CustomColumnConfig<TData>)
    default:
      return <span>{value?.toString() || ''}</span>
  }
}

// Header renderer utility
export function renderHeader(config: ColumnConfig): ReactNode {
  if (typeof config.header === 'function') {
    return config.header()
  }
  
  return (
    <div className={`text-${config.align || 'left'} font-medium`}>
      {config.header || config.id}
    </div>
  )
}
