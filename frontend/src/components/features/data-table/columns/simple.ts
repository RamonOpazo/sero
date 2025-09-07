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
  ColumnWidth,
} from '../types/column-config'
import type { Column } from '../types'
import type { ReactNode } from 'react'
import { adaptColumns } from './adapter'

export type SimpleColumnType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'badge'
  | 'status'
  | 'actions'
  | 'select'
  | 'custom'

export interface SimpleColumnBase<TData> {
  id: string
  header?: HeaderRenderer
  accessor?: ColumnAccessor<TData, any>
  type?: SimpleColumnType
  render?: CellRenderer<TData, any>
  width?: ColumnWidth
  minWidth?: ColumnWidth
  maxWidth?: ColumnWidth
  align?: ColumnAlignment
  sortable?: boolean
  pinned?: boolean
  visible?: boolean
  className?: string
  meta?: Record<string, any>
}

export interface SimpleTextColumn<TData> extends SimpleColumnBase<TData> {
  type?: 'text'
  maxLength?: number
  placeholder?: string
  transform?: 'uppercase' | 'lowercase' | 'capitalize'
}

export interface SimpleNumberColumn<TData> extends SimpleColumnBase<TData> {
  type: 'number'
  format?: {
    decimals?: number,
    prefix?: string,
    suffix?: string,
    thousands?: string,
    locale?: string,
  },
}

export interface SimpleDateColumn<TData> extends SimpleColumnBase<TData> {
  type: 'date'
  format?: {
    style?: 'relative' | 'absolute' | 'custom',
    pattern?: string,
    locale?: string,
  },
}

export interface SimpleBooleanColumn<TData> extends SimpleColumnBase<TData> {
  type: 'boolean'
  display?: {
    true: ReactNode,
    false: ReactNode,
  },
}

export interface SimpleBadgeColumn<TData> extends SimpleColumnBase<TData> {
  type: 'badge'
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  colorMap?: Record<string, string>
}

export interface SimpleStatusColumn<TData> extends SimpleColumnBase<TData> {
  type: 'status'
  statusMap?: Record<string, {
    label?: string,
    variant?: 'default' | 'secondary' | 'destructive' | 'outline',
    color?: string,
    icon?: any,
  }>,
}

export interface SimpleActionsColumn<TData> extends SimpleColumnBase<TData> {
  type: 'actions'
  actions: Array<{
    id: string,
    label: string,
    icon?: any,
    variant?: 'default' | 'destructive' | 'ghost',
    onClick: (row: TData) => void,
    disabled?: (row: TData) => boolean,
    hidden?: (row: TData) => boolean,
  }>,
}

export interface SimpleSelectColumn<TData> extends SimpleColumnBase<TData> {
  type: 'select'
  onSelectionChange?: (selectedRows: TData[]) => void
}

export interface SimpleCustomColumn<TData, TValue = any> extends SimpleColumnBase<TData> {
  type: 'custom'
  accessor: ColumnAccessor<TData, TValue>
  render: CellRenderer<TData, TValue>
}

export type SimpleColumn<TData> =
  | SimpleTextColumn<TData>
  | SimpleNumberColumn<TData>
  | SimpleDateColumn<TData>
  | SimpleBooleanColumn<TData>
  | SimpleBadgeColumn<TData>
  | SimpleStatusColumn<TData>
  | SimpleActionsColumn<TData>
  | SimpleSelectColumn<TData>
  | SimpleCustomColumn<TData, any>

export function toColumnConfig<TData>(def: SimpleColumn<TData>): ColumnConfig<TData> {
  const base = {
    id: def.id,
    accessor: (def as any).accessor ?? (def.id as any),
    header: def.header ?? def.id,
    width: def.width,
    minWidth: def.minWidth,
    maxWidth: def.maxWidth,
    align: def.align ?? 'left',
    sortable: def.sortable ?? false,
    pinned: def.pinned ?? false,
    visible: def.visible ?? true,
    className: def.className,
    cell: def.render as any,
  }

  switch (def.type) {
    case 'number':
      return {
        ...base,
        type: 'number',
        format: (def as SimpleNumberColumn<TData>).format,
      } as NumberColumnConfig<TData>
    case 'date':
      return {
        ...base,
        type: 'date',
        format: (def as SimpleDateColumn<TData>).format ?? { style: 'relative' },
      } as DateColumnConfig<TData>
    case 'boolean':
      return {
        ...base,
        type: 'boolean',
        display: (def as SimpleBooleanColumn<TData>).display,
      } as BooleanColumnConfig<TData>
    case 'badge':
      return {
        ...base,
        type: 'badge',
        variant: (def as SimpleBadgeColumn<TData>).variant ?? 'secondary',
        colorMap: (def as SimpleBadgeColumn<TData>).colorMap,
      } as BadgeColumnConfig<TData>
    case 'status':
      return {
        ...base,
        type: 'status',
        statusMap: (def as SimpleStatusColumn<TData>).statusMap,
      } as StatusColumnConfig<TData>
    case 'actions':
      return {
        ...base,
        type: 'actions',
        actions: (def as SimpleActionsColumn<TData>).actions,
      } as ActionsColumnConfig<TData>
    case 'select':
      return {
        ...base,
        type: 'select',
        onSelectionChange: (def as SimpleSelectColumn<TData>).onSelectionChange,
      } as SelectColumnConfig<TData>
    case 'custom':
      return {
        ...base,
        type: 'custom',
        render: (def as SimpleCustomColumn<TData, any>).render,
      } as CustomColumnConfig<TData>
    case 'text':
    default:
      return {
        ...base,
        type: 'text',
        maxLength: (def as SimpleTextColumn<TData>).maxLength,
        placeholder: (def as SimpleTextColumn<TData>).placeholder,
        transform: (def as SimpleTextColumn<TData>).transform,
      } as TextColumnConfig<TData>
  }
}

export function defineColumnsConfig<TData>(defs: Array<SimpleColumn<TData>>): ColumnConfig<TData>[] {
  return defs.map(toColumnConfig)
}

export function defineColumns<TData>(defs: Array<SimpleColumn<TData>>): Column<TData>[] {
  const configs = defineColumnsConfig(defs)
  return adaptColumns(configs)
}
