import { SelectionHandles } from './SelectionHandles'

type ResizeHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

interface Selection {
  id: string
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
  text?: string
}

interface SelectionLayerProps {
  selections: Selection[]
  currentPage: number
  activeSelectionId?: string | null
  scale: number
  isSelecting: boolean
  isResizing: boolean
  currentSelection?: { x: number, y: number, width: number, height: number } | null
  pageDimensions: { width: number, height: number } | null
  onSelectionEdit?: (id: string, updates: Partial<Selection>) => void
  onResizeStart: (e: React.MouseEvent, selectionId: string, handle: ResizeHandle) => void
}

export function SelectionLayer({
  selections,
  currentPage,
  activeSelectionId,
  scale,
  isSelecting,
  isResizing,
  currentSelection,
  pageDimensions,
  onSelectionEdit,
  onResizeStart
}: SelectionLayerProps) {
  // Get selections for current page
  const currentPageSelections = selections.filter(s => s.pageNumber === currentPage)

  // Helper function to convert normalized coordinates to pixel coordinates
  const normalizedToPixel = (normalizedCoords: { x: number, y: number, width: number, height: number }) => {
    if (!pageDimensions) return normalizedCoords
    return {
      x: normalizedCoords.x * pageDimensions.width,
      y: normalizedCoords.y * pageDimensions.height,
      width: normalizedCoords.width * pageDimensions.width,
      height: normalizedCoords.height * pageDimensions.height
    }
  }

  return (
    <>
      {/* Existing selections */}
      {currentPageSelections.map((selection) => {
        const isActive = selection.id === activeSelectionId
        const borderColor = isActive ? 'border-orange-500' : 'border-blue-500'
        const bgColor = isActive ? 'bg-orange-500/20' : 'bg-blue-500/20'
        
        // Convert normalized coordinates to pixel coordinates for display
        const pixelCoords = normalizedToPixel(selection)
        
        return (
          <div
            key={selection.id}
            className={`absolute border-2 ${borderColor} ${bgColor}`}
            style={{
              left: `${pixelCoords.x * scale}px`,
              top: `${pixelCoords.y * scale}px`,
              width: `${pixelCoords.width * scale}px`,
              height: `${pixelCoords.height * scale}px`,
              pointerEvents: onSelectionEdit ? 'auto' : 'none',
              zIndex: isActive ? 15 : 10
            }}
          >
            {/* Resize handles */}
            {onSelectionEdit && (
              <SelectionHandles
                selectionId={selection.id}
                isActive={isActive}
                onResizeStart={onResizeStart}
              />
            )}
          </div>
        )
      })}

      {/* Current selection being drawn */}
      {currentSelection && (
        <div
          className="absolute border-2 border-blue-600 bg-blue-600/30 pointer-events-none"
          style={{
            left: `${currentSelection.x * scale}px`,
            top: `${currentSelection.y * scale}px`,
            width: `${currentSelection.width * scale}px`,
            height: `${currentSelection.height * scale}px`
          }}
        />
      )}

      {/* Selection interaction overlay */}
      {isSelecting && !isResizing && (
        <div className="absolute inset-0 cursor-crosshair" />
      )}
    </>
  )
}
