import { useState, useCallback } from 'react'
import { type Table } from '@tanstack/react-table'

export interface UseColumnNavigationProps {
  columnsPerPage?: number
}

export function useColumnNavigation<TData>({ 
  columnsPerPage = 5
}: UseColumnNavigationProps = {}) {
  const [visibleColumnStart, setVisibleColumnStart] = useState(0)

  const getVisibleColumns = useCallback((table: Table<TData>) => {
    const allHeaders = table.getHeaderGroups()[0]?.headers || []
    const selectColumn = allHeaders.find(h => h.column.id === 'select')
    const actionsColumn = allHeaders.find(h => h.column.id === 'actions')
    const regularColumns = allHeaders.filter(h => h.column.id !== 'select' && h.column.id !== 'actions')
    
    const visibleRegularColumns = regularColumns.slice(visibleColumnStart, visibleColumnStart + columnsPerPage)
    const needsNavigation = regularColumns.length > columnsPerPage
    const canGoLeft = visibleColumnStart > 0
    const canGoRight = visibleColumnStart + columnsPerPage < regularColumns.length
    
    return {
      selectColumn,
      visibleRegularColumns,
      actionsColumn,
      needsNavigation,
      canGoLeft,
      canGoRight,
      totalRegularColumns: regularColumns.length,
      visibleColumnStart,
      columnsPerPage
    }
  }, [visibleColumnStart, columnsPerPage])
  
  const navigateColumns = useCallback((table: Table<TData>, direction: 'left' | 'right') => {
    const allHeaders = table.getHeaderGroups()[0]?.headers || []
    const regularColumns = allHeaders.filter(h => h.column.id !== 'select' && h.column.id !== 'actions')
    const totalRegularColumns = regularColumns.length
    
    if (direction === 'left' && visibleColumnStart > 0) {
      setVisibleColumnStart(Math.max(0, visibleColumnStart - 1))
    } else if (direction === 'right' && visibleColumnStart + columnsPerPage < totalRegularColumns) {
      setVisibleColumnStart(Math.min(totalRegularColumns - columnsPerPage, visibleColumnStart + 1))
    }
  }, [visibleColumnStart, columnsPerPage])

  return {
    getVisibleColumns,
    navigateColumns,
    visibleColumnStart,
    columnsPerPage,
  }
}
