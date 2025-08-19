import { CheckCircle, XCircle, Clock, AlertCircle, Zap } from 'lucide-react'
import type { 
  TextColumnConfig,
  NumberColumnConfig,
  DateColumnConfig,
  StatusColumnConfig,
  BadgeColumnConfig,
  BooleanColumnConfig
} from '../types/column-config'
import { textColumn, numberColumn, dateColumn, statusColumn, badgeColumn, booleanColumn } from './factories'

// Common status configurations
export const CommonStatusMaps = {
  // Generic active/inactive status
  activeStatus: {
    active: { 
      label: 'Active', 
      variant: 'default' as const, 
      color: 'bg-green-50 text-green-700 border-green-200',
      icon: CheckCircle
    },
    inactive: { 
      label: 'Inactive', 
      variant: 'secondary' as const, 
      color: 'bg-gray-50 text-gray-700 border-gray-200',
      icon: XCircle
    }
  },
  
  // Task/project status
  taskStatus: {
    pending: { 
      label: 'Pending', 
      variant: 'outline' as const, 
      color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      icon: Clock
    },
    in_progress: { 
      label: 'In Progress', 
      variant: 'default' as const, 
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Zap
    },
    completed: { 
      label: 'Completed', 
      variant: 'default' as const, 
      color: 'bg-green-50 text-green-700 border-green-200',
      icon: CheckCircle
    },
    cancelled: { 
      label: 'Cancelled', 
      variant: 'destructive' as const, 
      color: 'bg-red-50 text-red-700 border-red-200',
      icon: XCircle
    }
  },
  
  // Processing status
  processingStatus: {
    awaiting: { 
      label: 'Awaiting', 
      variant: 'outline' as const, 
      color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      icon: Clock
    },
    processing: { 
      label: 'Processing', 
      variant: 'default' as const, 
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Zap
    },
    processed: { 
      label: 'Processed', 
      variant: 'default' as const, 
      color: 'bg-green-50 text-green-700 border-green-200',
      icon: CheckCircle
    },
    error: { 
      label: 'Error', 
      variant: 'destructive' as const, 
      color: 'bg-red-50 text-red-700 border-red-200',
      icon: AlertCircle
    }
  }
}

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
      className: 'font-mono'
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
      className: 'font-mono text-sm'
    })
  },

  /**
   * Phone column - monospace, fixed width
   */
  phone<TData>(key: keyof TData = 'phone' as keyof TData): TextColumnConfig<TData> {
    return textColumn(key as any, {
      header: 'Phone',
      width: '150px',
      className: 'font-mono'
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
      className: 'font-mono'
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
      className: 'font-mono'
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
   * Active/inactive status column
   */
  activeStatus<TData>(key: keyof TData = 'status' as keyof TData): StatusColumnConfig<TData> {
    return statusColumn(key as any, {
      header: 'Status',
      width: '120px',
      statusMap: CommonStatusMaps.activeStatus
    })
  },

  /**
   * Task status column (pending, in_progress, completed, cancelled)
   */
  taskStatus<TData>(key: keyof TData = 'status' as keyof TData): StatusColumnConfig<TData> {
    return statusColumn(key as any, {
      header: 'Status',
      width: '140px',
      statusMap: CommonStatusMaps.taskStatus
    })
  },

  /**
   * Processing status column (awaiting, processing, processed, error)
   */
  processingStatus<TData>(key: keyof TData = 'status' as keyof TData): StatusColumnConfig<TData> {
    return statusColumn(key as any, {
      header: 'Status',
      width: '140px',
      statusMap: CommonStatusMaps.processingStatus
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
      className: 'font-mono'
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

// Commonly used column combinations
export const columnCombinations = {
  /**
   * Standard user table columns
   */
  userColumns<TData>() {
    return [
      columnPresets.name<TData>(),
      columnPresets.email<TData>(),
      columnPresets.role<TData>(),
      columnPresets.department<TData>(),
      columnPresets.activeStatus<TData>(),
      columnPresets.createdAt<TData>()
    ]
  },

  /**
   * Standard project table columns
   */
  projectColumns<TData>() {
    return [
      columnPresets.name<TData>(),
      columnPresets.description<TData>(),
      columnPresets.taskStatus<TData>(),
      columnPresets.count<TData>('document_count' as keyof TData, 'Documents'),
      columnPresets.updatedAt<TData>(),
      columnPresets.createdAt<TData>()
    ]
  },

  /**
   * Standard document table columns
   */
  documentColumns<TData>() {
    return [
      columnPresets.title<TData>(),
      columnPresets.description<TData>(),
      columnPresets.processingStatus<TData>(),
      columnPresets.count<TData>('page_count' as keyof TData, 'Pages'),
      columnPresets.updatedAt<TData>()
    ]
  }
}

// Export everything for convenience
export default columnPresets
