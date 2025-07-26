import { useCallback } from 'react'

type ResizeHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

interface SelectionHandlesProps {
  selectionId: string
  isActive: boolean
  onResizeStart: (e: React.MouseEvent, selectionId: string, handle: ResizeHandle) => void
}

export function SelectionHandles({ selectionId, isActive, onResizeStart }: SelectionHandlesProps) {
  const handleColor = isActive ? 'bg-orange-600' : 'bg-blue-600'
  const handleHoverColor = isActive ? 'hover:bg-orange-700' : 'hover:bg-blue-700'

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault()
    e.stopPropagation()
    onResizeStart(e, selectionId, handle)
  }, [selectionId, onResizeStart])

  return (
    <>
      {/* Top-left handle */}
      <div
        className={`absolute ${handleColor} border-2 border-white cursor-nw-resize ${handleHoverColor} transition-colors`}
        style={{
          left: '-6px',
          top: '-6px',
          width: '12px',
          height: '12px',
          pointerEvents: 'auto',
          zIndex: 25
        }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'top-left')}
      />
      
      {/* Top-right handle */}
      <div
        className={`absolute ${handleColor} border-2 border-white cursor-ne-resize ${handleHoverColor} transition-colors`}
        style={{
          right: '-6px',
          top: '-6px',
          width: '12px',
          height: '12px',
          pointerEvents: 'auto',
          zIndex: 25
        }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'top-right')}
      />
      
      {/* Bottom-left handle */}
      <div
        className={`absolute ${handleColor} border-2 border-white cursor-sw-resize ${handleHoverColor} transition-colors`}
        style={{
          left: '-6px',
          bottom: '-6px',
          width: '12px',
          height: '12px',
          pointerEvents: 'auto',
          zIndex: 25
        }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-left')}
      />
      
      {/* Bottom-right handle */}
      <div
        className={`absolute ${handleColor} border-2 border-white cursor-se-resize ${handleHoverColor} transition-colors`}
        style={{
          right: '-6px',
          bottom: '-6px',
          width: '12px',
          height: '12px',
          pointerEvents: 'auto',
          zIndex: 25
        }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-right')}
      />
    </>
  )
}
