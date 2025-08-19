import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
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
  ColumnAccessor,
  CellRenderer,
  HeaderRenderer,
  ColumnAlignment,
  ColumnWidth
} from '../types/column-config'

// Simplified string type for column keys
type KeyOf<_T> = string

// Base configuration that can be applied to any column type
interface BaseColumnOptions<TData, TValue> {
  header?: HeaderRenderer
  width?: ColumnWidth
  minWidth?: ColumnWidth
  maxWidth?: ColumnWidth
  align?: ColumnAlignment
  sortable?: boolean
  pinned?: boolean
  visible?: boolean
  className?: string
  cell?: CellRenderer<TData, TValue>
}

// Internal helper to create base column configuration
function createBaseColumn<TData, TValue>(
  id: string,
  accessor: ColumnAccessor<TData, TValue>,
  options: BaseColumnOptions<TData, TValue> = {}
): Omit<ColumnConfig<TData>, 'type'> {
  return {
    id,
    accessor: accessor as any, // Type assertion for flexibility
    header: options.header ?? id,
    width: options.width,
    minWidth: options.minWidth,
    maxWidth: options.maxWidth,
    align: options.align ?? 'left',
    sortable: options.sortable ?? false,
    pinned: options.pinned ?? false,
    visible: options.visible ?? true,
    className: options.className,
    cell: options.cell,
  }
}

// Text Column Factory
export interface TextColumnOptions<TData> extends BaseColumnOptions<TData, string> {
  maxLength?: number
  placeholder?: string
  transform?: 'uppercase' | 'lowercase' | 'capitalize'
}

export function textColumn<TData>(
  key: KeyOf<TData>,
  options: TextColumnOptions<TData> = {}
): TextColumnConfig<TData> {
  return {
    ...createBaseColumn(key, key as any, options),
    type: 'text',
    maxLength: options.maxLength,
    placeholder: options.placeholder,
    transform: options.transform,
  } as any
}

// Number Column Factory
export interface NumberColumnOptions<TData> extends BaseColumnOptions<TData, number> {
  format?: {
    decimals?: number
    prefix?: string
    suffix?: string
    thousands?: string
    locale?: string
  }
}

export function numberColumn<TData>(
  key: KeyOf<TData>,
  options: NumberColumnOptions<TData> = {}
): NumberColumnConfig<TData> {
  return {
    ...createBaseColumn(key, key as any, options),
    type: 'number',
    format: options.format,
  } as any
}

// Date Column Factory
export interface DateColumnOptions<TData> extends BaseColumnOptions<TData, string | Date> {
  format?: {
    style?: 'relative' | 'absolute' | 'custom'
    pattern?: string
    locale?: string
  }
}

export function dateColumn<TData>(
  key: KeyOf<TData>,
  options: DateColumnOptions<TData> = {}
): DateColumnConfig<TData> {
  return {
    ...createBaseColumn(key, key as any, options),
    type: 'date',
    format: options.format ?? { style: 'relative' },
  } as any
}

// Boolean Column Factory
export interface BooleanColumnOptions<TData> extends BaseColumnOptions<TData, boolean> {
  display?: {
    true: ReactNode
    false: ReactNode
  }
}

export function booleanColumn<TData>(
  key: KeyOf<TData>,
  options: BooleanColumnOptions<TData> = {}
): BooleanColumnConfig<TData> {
  return {
    ...createBaseColumn(key, key as any, options),
    type: 'boolean',
    display: options.display,
  } as any
}

// Badge Column Factory
export interface BadgeColumnOptions<TData> extends BaseColumnOptions<TData, string | number> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  colorMap?: Record<string, string>
}

export function badgeColumn<TData>(
  key: KeyOf<TData>,
  options: BadgeColumnOptions<TData> = {}
): BadgeColumnConfig<TData> {
  return {
    ...createBaseColumn(key, key as any, options),
    type: 'badge',
    variant: options.variant ?? 'secondary',
    colorMap: options.colorMap,
  } as any
}

// Status Column Factory
export interface StatusColumnOptions<TData> extends BaseColumnOptions<TData, string> {
  statusMap?: Record<string, {
    label?: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
    color?: string
    icon?: LucideIcon
  }>
}

export function statusColumn<TData>(
  key: KeyOf<TData>,
  options: StatusColumnOptions<TData> = {}
): StatusColumnConfig<TData> {
  return {
    ...createBaseColumn(key, key as any, options),
    type: 'status',
    statusMap: options.statusMap,
  } as any
}

// Actions Column Factory
export interface ActionsColumnOptions<TData> extends Omit<BaseColumnOptions<TData, any>, 'cell'> {
  actions: Array<{
    id: string
    label: string
    icon?: LucideIcon
    variant?: 'default' | 'destructive' | 'ghost'
    onClick: (row: TData) => void
    disabled?: (row: TData) => boolean
    hidden?: (row: TData) => boolean
  }>
}

export function actionsColumn<TData>(
  id: string = 'actions',
  options: ActionsColumnOptions<TData>
): ActionsColumnConfig<TData> {
  return {
    ...createBaseColumn(id, () => null, options),
    type: 'actions',
    actions: options.actions,
  } as any
}

// Select Column Factory
export interface SelectColumnOptions<TData> extends Omit<BaseColumnOptions<TData, boolean>, 'cell'> {
  onSelectionChange?: (selectedRows: TData[]) => void
}

export function selectColumn<TData>(
  id: string = 'select',
  options: SelectColumnOptions<TData> = {}
): SelectColumnConfig<TData> {
  return {
    ...createBaseColumn(id, () => false, options),
    type: 'select',
    onSelectionChange: options.onSelectionChange,
  } as any
}

// Custom Column Factory
export interface CustomColumnOptions<TData, TValue> extends Omit<BaseColumnOptions<TData, TValue>, 'cell'> {
  render: CellRenderer<TData, TValue>
}

export function customColumn<TData, TValue = any>(
  id: string,
  accessor: ColumnAccessor<TData, TValue>,
  options: CustomColumnOptions<TData, TValue>
): CustomColumnConfig<TData, TValue> {
  return {
    ...createBaseColumn(id, accessor, options),
    type: 'custom',
    render: options.render,
  } as any
}

// Convenience functions for common patterns
export const column = {
  text: textColumn,
  number: numberColumn,
  date: dateColumn,
  boolean: booleanColumn,
  badge: badgeColumn,
  status: statusColumn,
  actions: actionsColumn,
  select: selectColumn,
  custom: customColumn,
}

// Advanced column utilities
export const ColumnUtils = {
  // Create a pinned column (commonly used for names/IDs)
  pinnedText<TData>(
    key: KeyOf<TData>,
    options: Omit<TextColumnOptions<TData>, 'pinned'> = {}
  ): TextColumnConfig<TData> {
    return textColumn(key, { ...options, pinned: true })
  },

  // Create a sortable column
  sortableText<TData>(
    key: KeyOf<TData>,
    options: Omit<TextColumnOptions<TData>, 'sortable'> = {}
  ): TextColumnConfig<TData> {
    return textColumn(key, { ...options, sortable: true })
  },

  // Create a centered column
  centeredColumn<TData>(
    key: KeyOf<TData>,
    type: 'text' | 'number' | 'badge' = 'text',
    options: any = {}
  ): ColumnConfig<TData> {
    const baseOptions = { ...options, align: 'center' as const }
    
    switch (type) {
      case 'number':
        return numberColumn(key, baseOptions)
      case 'badge':
        return badgeColumn(key, baseOptions)
      default:
        return textColumn(key, baseOptions)
    }
  },

  // Create an ID column (commonly pinned, narrow, right-aligned)
  idColumn<TData>(
    key: KeyOf<TData> = 'id' as KeyOf<TData>,
    options: Omit<NumberColumnOptions<TData>, 'align' | 'width'> = {}
  ): NumberColumnConfig<TData> {
    return numberColumn(key, {
      ...options,
      align: 'right',
      width: '80px',
      header: 'ID',
    })
  },

  // Create a description column (commonly truncated)
  descriptionColumn<TData>(
    key: KeyOf<TData> = 'description' as KeyOf<TData>,
    maxLength: number = 50,
    options: Omit<TextColumnOptions<TData>, 'maxLength'> = {}
  ): TextColumnConfig<TData> {
    return textColumn(key, {
      ...options,
      maxLength,
      header: 'Description',
    })
  }
}

// Export all factories for convenience
export {
  textColumn as text,
  numberColumn as number,
  dateColumn as date,
  booleanColumn as boolean,
  badgeColumn as badge,
  statusColumn as status,
  actionsColumn as actions,
  selectColumn as select,
  customColumn as custom,
}
