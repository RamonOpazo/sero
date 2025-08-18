import { useState, useEffect, useMemo } from 'react'

interface ResponsiveColumnConfig {
  priority?: number // Higher priority = shown first (0 = highest priority)
  minWidth?: number // Minimum width for this column in pixels
  alwaysVisible?: boolean // Never hide this column
}

export interface ExtendedColumnDef {
  responsive?: ResponsiveColumnConfig
  // Include common ColumnDef properties we need
  id?: string
  size?: number
  maxSize?: number
  cell?: any
  header?: any
  accessorKey?: string
}

interface UseResponsiveColumnsProps {
  columns: ExtendedColumnDef[]
  containerRef?: React.RefObject<HTMLElement | null>
  minTableWidth?: number // Minimum width before hiding columns
}

interface UseResponsiveColumnsReturn {
  visibleColumns: ExtendedColumnDef[]
  hiddenColumns: ExtendedColumnDef[]
  totalWidth: number
  availableWidth: number
  isResponsive: boolean
}

export function useResponsiveColumns({
  columns,
  containerRef,
  minTableWidth = 800
}: UseResponsiveColumnsProps): UseResponsiveColumnsReturn {
  const [containerWidth, setContainerWidth] = useState<number>(0)
  const [isClient, setIsClient] = useState(false)

  // Track container width changes
  useEffect(() => {
    setIsClient(true)
    
    const updateWidth = () => {
      if (containerRef?.current) {
        setContainerWidth(containerRef.current.clientWidth)
      } else {
        // Fallback to viewport width
        setContainerWidth(window.innerWidth - 48) // Account for padding
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    
    return () => window.removeEventListener('resize', updateWidth)
  }, [containerRef])

  // Calculate visible and hidden columns
  const { visibleColumns, hiddenColumns, totalWidth } = useMemo(() => {
    if (!isClient || containerWidth === 0) {
      return {
        visibleColumns: columns,
        hiddenColumns: [],
        totalWidth: 0
      }
    }

    // Sort columns by priority (always visible first, then by priority)
    const sortedColumns = [...columns].sort((a, b) => {
      const aPriority = a.responsive?.alwaysVisible ? -1 : (a.responsive?.priority ?? 999)
      const bPriority = b.responsive?.alwaysVisible ? -1 : (b.responsive?.priority ?? 999)
      return aPriority - bPriority
    })

    let currentWidth = 0
    const visible: ExtendedColumnDef[] = []
    const hidden: ExtendedColumnDef[] = []

    // Default column widths
    const getColumnWidth = (column: ExtendedColumnDef): number => {
      if (column.responsive?.minWidth) return column.responsive.minWidth
      if (column.size) return column.size
      if (column.maxSize) return Math.min(column.maxSize, 200)
      return 150 // Default column width
    }

    for (const column of sortedColumns) {
      const columnWidth = getColumnWidth(column)
      const wouldExceedWidth = currentWidth + columnWidth > containerWidth

      // Always include columns marked as alwaysVisible
      if (column.responsive?.alwaysVisible) {
        visible.push(column)
        currentWidth += columnWidth
      } 
      // Include column if it fits or if we haven't reached minimum table width
      else if (!wouldExceedWidth || currentWidth < minTableWidth) {
        visible.push(column)
        currentWidth += columnWidth
      } 
      // Hide column if adding it would exceed container width
      else {
        hidden.push(column)
      }
    }

    return {
      visibleColumns: visible,
      hiddenColumns: hidden,
      totalWidth: currentWidth
    }
  }, [columns, containerWidth, minTableWidth, isClient])

  return {
    visibleColumns,
    hiddenColumns,
    totalWidth,
    availableWidth: containerWidth,
    isResponsive: hiddenColumns.length > 0
  }
}
