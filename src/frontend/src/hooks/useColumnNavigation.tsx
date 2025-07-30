import { useState, useCallback, useRef, useEffect } from 'react'
import { type Table, type Header } from '@tanstack/react-table'

const MIN_COLUMN_WIDTH = 128 // 8rem
const SELECT_COLUMN_WIDTH = 32 // 2rem
const ACTIONS_COLUMN_WIDTH = 64 // 4rem

export interface UseColumnNavigationProps {
  hasSelectColumn: boolean
  hasActionsColumn: boolean
}

export function useColumnNavigation<TData>({
  hasSelectColumn,
  hasActionsColumn,
}: UseColumnNavigationProps) {
  const [visibleColumnStart, setVisibleColumnStart] = useState(0)
  const [columnsPerPage, setColumnsPerPage] = useState(1)
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const getRegularColumns = useCallback((table: Table<TData>) => {
    const allHeaders = table.getHeaderGroups()[0]?.headers || []
    return allHeaders.filter(h => h.column.id !== 'select' && h.column.id !== 'actions')
  }, [])

  const calculateColumnsPerPage = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth
      let fixedWidth = 0
      if (hasSelectColumn) fixedWidth += SELECT_COLUMN_WIDTH
      if (hasActionsColumn) fixedWidth += ACTIONS_COLUMN_WIDTH
      
      const availableWidth = containerWidth - fixedWidth
      const newColumnsPerPage = Math.floor(availableWidth / MIN_COLUMN_WIDTH)
      setColumnsPerPage(Math.max(1, newColumnsPerPage))
    }
  }, [hasSelectColumn, hasActionsColumn])

  useEffect(() => {
    const observer = new ResizeObserver(calculateColumnsPerPage)
    const container = containerRef.current
    if (container) {
      observer.observe(container)
      calculateColumnsPerPage()
    }
    return () => {
      if (container) observer.unobserve(container)
    }
  }, [calculateColumnsPerPage])

  const getVisibleColumns = useCallback((table: Table<TData>) => {
    const allHeaders = table.getHeaderGroups()[0]?.headers || []
    const selectColumn = allHeaders.find(h => h.column.id === 'select')
    const actionsColumn = allHeaders.find(h => h.column.id === 'actions')
    const regularColumns = getRegularColumns(table)
    
    const totalRegularColumns = regularColumns.length
    const adjustedStart = Math.max(0, Math.min(visibleColumnStart, totalRegularColumns > columnsPerPage ? totalRegularColumns - columnsPerPage : 0))
    const visibleRegularColumns = regularColumns.slice(adjustedStart, adjustedStart + columnsPerPage)
    
    const needsNavigation = totalRegularColumns > columnsPerPage
    const canGoLeft = adjustedStart > 0
    const canGoRight = adjustedStart + columnsPerPage < totalRegularColumns
    
    return {
      selectColumn,
      visibleRegularColumns,
      actionsColumn,
      needsNavigation,
      canGoLeft,
      canGoRight,
      adjustedStart,
    }
  }, [visibleColumnStart, columnsPerPage, getRegularColumns])
  
  const navigateColumns = useCallback((table: Table<TData>, direction: 'left' | 'right') => {
    if (isAnimating) return
    
    const { canGoLeft, canGoRight } = getVisibleColumns(table)
    if ((direction === 'left' && !canGoLeft) || (direction === 'right' && !canGoRight)) {
        return
    }

    setIsAnimating(true)
    setAnimationDirection(direction)
    setVisibleColumnStart(prev => direction === 'left' ? prev - 1 : prev + 1)

    setTimeout(() => {
      setIsAnimating(false)
      setAnimationDirection(null)
    }, 500) // Animation duration
  }, [isAnimating, getVisibleColumns])

  const getColumnKey = (header: Header<TData, unknown>) => {
    return `${header.id}-${visibleColumnStart}`
  }

  return {
    containerRef,
    getVisibleColumns,
    navigateColumns,
    animationDirection,
    getColumnKey,
  }
}
