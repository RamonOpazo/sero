import { useState, useEffect, useMemo } from 'react'

export interface ResponsiveColumnConfig {
  priority?: number // Priority for ordering columns
  minWidth?: number // Minimum width for this column in pixels
  pinned?: 'left' | 'right' | false // Pin column to left, right, or allow scrolling
}

export interface ExtendedColumnDef {
  responsive?: ResponsiveColumnConfig
  // Include all essential ColumnDef properties
  id?: string
  size?: number
  maxSize?: number
  minSize?: number
  cell?: any
  header?: any
  accessorKey?: string
  enableHiding?: boolean
  enableSorting?: boolean
  enableResizing?: boolean
  meta?: any
  // Add any other properties we might need
  [key: string]: any
}

interface UseResponsiveColumnsProps {
  columns: ExtendedColumnDef[]
  containerRef?: React.RefObject<HTMLElement | null>
  minTableWidth?: number // Minimum width before hiding columns
}

interface UseResponsiveColumnsReturn {
  leftPinnedColumns: ExtendedColumnDef[]
  scrollableColumns: ExtendedColumnDef[]
  rightPinnedColumns: ExtendedColumnDef[]
  visibleScrollableColumns: ExtendedColumnDef[]
  canScrollLeft: boolean
  canScrollRight: boolean
  scrollOffset: number
  maxScrollOffset: number
  scrollLeft: () => void
  scrollRight: () => void
  totalWidth: number
  availableWidth: number
  needsNavigation: boolean
}

export function useResponsiveColumns({
  columns,
  containerRef
}: UseResponsiveColumnsProps): UseResponsiveColumnsReturn {
  const [containerWidth, setContainerWidth] = useState<number>(0)
  const [isClient, setIsClient] = useState(false)
  const [scrollOffset, setScrollOffset] = useState(0)

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

  // Reset scroll when columns or container width changes
  useEffect(() => {
    setScrollOffset(0)
  }, [columns, containerWidth])

  // Separate columns by pinning
  const { leftPinnedColumns, scrollableColumns, rightPinnedColumns } = useMemo(() => {
    const leftPinned: ExtendedColumnDef[] = []
    const scrollable: ExtendedColumnDef[] = []
    const rightPinned: ExtendedColumnDef[] = []

    // Sort columns by priority
    const sortedColumns = [...columns].sort((a, b) => {
      const aPriority = a.responsive?.priority ?? 999
      const bPriority = b.responsive?.priority ?? 999
      return aPriority - bPriority
    })

    sortedColumns.forEach(column => {
      if (column.responsive?.pinned === 'left') {
        leftPinned.push(column)
      } else if (column.responsive?.pinned === 'right') {
        rightPinned.push(column)
      } else {
        scrollable.push(column)
      }
    })

    return {
      leftPinnedColumns: leftPinned,
      scrollableColumns: scrollable,
      rightPinnedColumns: rightPinned
    }
  }, [columns])

  // Calculate column widths and visible scrollable columns
  const {
    visibleScrollableColumns,
    canScrollLeft,
    canScrollRight,
    maxScrollOffset,
    totalWidth,
    needsNavigation
  } = useMemo(() => {
    if (!isClient || containerWidth === 0) {
      return {
        visibleScrollableColumns: scrollableColumns,
        canScrollLeft: false,
        canScrollRight: false,
        maxScrollOffset: 0,
        totalWidth: 0,
        needsNavigation: false
      }
    }

    // Get column width function
    const getColumnWidth = (column: ExtendedColumnDef): number => {
      if (column.responsive?.minWidth) return column.responsive.minWidth
      if (column.size) return column.size
      if (column.maxSize) return Math.min(column.maxSize, 200)
      return 150 // Default column width
    }

    // Calculate pinned columns width
    const leftPinnedWidth = leftPinnedColumns.reduce((sum, col) => sum + getColumnWidth(col), 0)
    const rightPinnedWidth = rightPinnedColumns.reduce((sum, col) => sum + getColumnWidth(col), 0)
    
    // Available width for scrollable columns (actions column will contain navigation)
    const availableScrollableWidth = containerWidth - leftPinnedWidth - rightPinnedWidth
    
    // If we have enough space for all scrollable columns, show them all
    const totalScrollableWidth = scrollableColumns.reduce((sum, col) => sum + getColumnWidth(col), 0)
    
    if (totalScrollableWidth <= availableScrollableWidth) {
      return {
        visibleScrollableColumns: scrollableColumns,
        canScrollLeft: false,
        canScrollRight: false,
        maxScrollOffset: 0,
        totalWidth: leftPinnedWidth + totalScrollableWidth + rightPinnedWidth,
        needsNavigation: false
      }
    }

    // Calculate how many columns we can fit - be more aggressive
    let currentWidth = 0
    let visibleCount = 0
    
    // Reserve space for potential scrolling (more conservative approach)
    const reservedSpace = 0.8 // Use 80% of available space to ensure scrolling triggers
    const effectiveWidth = availableScrollableWidth * reservedSpace
    
    // Count how many columns fit in available space
    for (let i = 0; i < scrollableColumns.length; i++) {
      const columnWidth = getColumnWidth(scrollableColumns[i])
      if (currentWidth + columnWidth <= effectiveWidth) {
        currentWidth += columnWidth
        visibleCount++
      } else {
        break
      }
    }
    
    // Ensure we show at least 1 column if there's any space
    if (visibleCount === 0 && scrollableColumns.length > 0) {
      visibleCount = 1
    }
    
    // Force navigation if we have more than 3 scrollable columns and limited space
    if (scrollableColumns.length > 3 && availableScrollableWidth < 600) {
      visibleCount = Math.min(visibleCount, 2)
    }
    
    // Calculate start index based on scroll offset
    const maxStartIndex = Math.max(0, scrollableColumns.length - visibleCount)
    const startIndex = Math.min(scrollOffset, maxStartIndex)
    const endIndex = Math.min(startIndex + visibleCount - 1, scrollableColumns.length - 1)
    
    const visibleScrollable = scrollableColumns.slice(startIndex, endIndex + 1)
    const maxOffset = maxStartIndex
    
    return {
      visibleScrollableColumns: visibleScrollable,
      canScrollLeft: scrollOffset > 0,
      canScrollRight: scrollOffset < maxOffset,
      maxScrollOffset: maxOffset,
      totalWidth: leftPinnedWidth + currentWidth + rightPinnedWidth,
      needsNavigation: scrollableColumns.length > visibleCount
    }
  }, [isClient, containerWidth, leftPinnedColumns, scrollableColumns, rightPinnedColumns, scrollOffset])

  // Navigation functions
  const scrollLeft = () => {
    setScrollOffset(prev => Math.max(0, prev - 1))
  }

  const scrollRight = () => {
    setScrollOffset(prev => Math.min(maxScrollOffset, prev + 1))
  }

  return {
    leftPinnedColumns,
    scrollableColumns,
    rightPinnedColumns,
    visibleScrollableColumns,
    canScrollLeft,
    canScrollRight,
    scrollOffset,
    maxScrollOffset,
    scrollLeft,
    scrollRight,
    totalWidth,
    availableWidth: containerWidth,
    needsNavigation
  }
}
