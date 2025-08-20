import type { 
  TextColumnConfig,
  NumberColumnConfig,
  DateColumnConfig,
  BadgeColumnConfig,
  BooleanColumnConfig
} from '../types/column-config'
import { textColumn, numberColumn, dateColumn, badgeColumn, booleanColumn } from './factories'

// Preset column factory functions
export const columnPresets = {
  /**
   * Standard ID column - right-aligned, narrow, sortable
   */
  id<TData>(key: keyof TData = 'id' as keyof TData): NumberColumnConfig<TData> {
    return numberColumn(key as any, {
      header: 'ID',
      width: '80px',
      align: 'right',
      sortable: true,
      className: 'font-medium'
    })
  },

  /**
   * Name column - typically pinned, sortable, medium width
   */
  name<TData>(key: keyof TData = 'name' as keyof TData): TextColumnConfig<TData> {
    return textColumn(key as any, {
      header: 'Name',
      width: '250px',
      pinned: true,
      sortable: true,
      className: 'font-medium'
    })
  },

  /**
   * Title column - similar to name but not pinned
   */
  title<TData>(key: keyof TData = 'title' as keyof TData): TextColumnConfig<TData> {
    return textColumn(key as any, {
      header: 'Title',
      width: '200px',
      sortable: true,
      className: 'font-medium'
    })
  },

  /**
   * Description column - truncated, wider
   */
  description<TData>(
    key: keyof TData = 'description' as keyof TData,
    maxLength: number = 50
  ): TextColumnConfig<TData> {
    return textColumn(key as any, {
      header: 'Description',
      width: '300px',
      maxLength,
      placeholder: 'No description',
      className: 'text-muted-foreground'
    })
  },

  /**
   * Email column - truncated, monospace
   */
  email<TData>(key: keyof TData = 'email' as keyof TData): TextColumnConfig<TData> {
    return textColumn(key as any, {
      header: 'Email',
      width: '220px',
      maxLength: 30,
      className: 'text-muted-foreground'
    })
  },

  /**
   * Phone column - monospace, fixed width
   */
  phone<TData>(key: keyof TData = 'phone' as keyof TData): TextColumnConfig<TData> {
    return textColumn(key as any, {
      header: 'Phone',
      width: '150px',
      className: 'font-medium'
    })
  },

  /**
   * Count/quantity column - right-aligned, badge display
   */
  count<TData>(
    key: keyof TData,
    header: string = 'Count'
  ): BadgeColumnConfig<TData> {
    return badgeColumn(key as any, {
      header,
      width: '100px',
      align: 'center',
      variant: 'secondary'
    })
  },

  /**
   * Currency column - right-aligned, formatted
   */
  currency<TData>(
    key: keyof TData,
    currency: string = '$',
    header: string = 'Amount'
  ): NumberColumnConfig<TData> {
    return numberColumn(key as any, {
      header,
      width: '120px',
      align: 'right',
      sortable: true,
      format: {
        decimals: 2,
        prefix: currency,
        thousands: ','
      },
      className: 'font-medium'
    })
  },

  /**
   * Percentage column - right-aligned, with % suffix
   */
  percentage<TData>(
    key: keyof TData,
    header: string = 'Percentage'
  ): NumberColumnConfig<TData> {
    return numberColumn(key as any, {
      header,
      width: '100px',
      align: 'right',
      sortable: true,
      format: {
        decimals: 1,
        suffix: '%'
      },
      className: 'font-medium'
    })
  },

  /**
   * Date created column - relative formatting
   */
  createdAt<TData>(key: keyof TData = 'created_at' as keyof TData): DateColumnConfig<TData> {
    return dateColumn(key as any, {
      header: 'Created',
      width: '130px',
      sortable: true,
      format: { style: 'relative' }
    })
  },

  /**
   * Date updated column - relative formatting
   */
  updatedAt<TData>(key: keyof TData = 'updated_at' as keyof TData): DateColumnConfig<TData> {
    return dateColumn(key as any, {
      header: 'Updated',
      width: '130px',
      sortable: true,
      format: { style: 'relative' }
    })
  },

  /**
   * Generic date column - absolute formatting
   */
  date<TData>(
    key: keyof TData,
    header: string = 'Date'
  ): DateColumnConfig<TData> {
    return dateColumn(key as any, {
      header,
      width: '120px',
      sortable: true,
      format: { style: 'absolute' }
    })
  },

  /**
   * Boolean column with Yes/No display
   */
  yesNo<TData>(
    key: keyof TData,
    header: string = 'Enabled'
  ): BooleanColumnConfig<TData> {
    return booleanColumn(key as any, {
      header,
      width: '100px',
      align: 'center',
      display: {
        true: 'Yes',
        false: 'No'
      }
    })
  },

  /**
   * Boolean column with icon display (default)
   */
  enabled<TData>(
    key: keyof TData = 'enabled' as keyof TData,
    header: string = 'Enabled'
  ): BooleanColumnConfig<TData> {
    return booleanColumn(key as any, {
      header,
      width: '100px',
      align: 'center'
    })
  },

  /**
   * Version column - centered, monospace
   */
  version<TData>(key: keyof TData = 'version' as keyof TData): TextColumnConfig<TData> {
    return textColumn(key as any, {
      header: 'Version',
      width: '100px',
      align: 'center',
      className: 'font-medium'
    })
  },

  /**
   * Role/type column - capitalized
   */
  role<TData>(
    key: keyof TData = 'role' as keyof TData,
    header: string = 'Role'
  ): TextColumnConfig<TData> {
    return textColumn(key as any, {
      header,
      width: '120px',
      transform: 'capitalize',
      className: 'font-medium'
    })
  },

  /**
   * Department/category column
   */
  department<TData>(
    key: keyof TData = 'department' as keyof TData,
    header: string = 'Department'
  ): TextColumnConfig<TData> {
    return textColumn(key as any, {
      header,
      width: '150px',
      transform: 'capitalize'
    })
  },

  /**
   * Location column
   */
  location<TData>(
    key: keyof TData = 'location' as keyof TData,
    header: string = 'Location'
  ): TextColumnConfig<TData> {
    return textColumn(key as any, {
      header,
      width: '140px'
    })
  }
}

// Export everything for convenience
export default columnPresets
