import { useRef, useState, useCallback, useEffect } from 'react'
import { Document as PDFDocument, Page } from 'react-pdf'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, AlertCircle, Loader2 } from 'lucide-react'

interface Selection {
  id: string
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
  text?: string
}

interface FilePDFViewerProps {
  fileUrl: string | null
  currentPage: number
  scale: number
  isLoading: boolean
  error: string | null
  isSelecting: boolean
  selections: Selection[]
  onLoadSuccess: ({ numPages }: { numPages: number }) => void
  onLoadError: (error: Error) => void
  onSelectionCreate?: (selection: Omit<Selection, 'id'>) => void
  onSelectionEdit?: (id: string, updates: Partial<Selection>) => void
}

type ResizeHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export function FilePDFViewer({
  fileUrl,
  currentPage,
  scale,
  isLoading,
  error,
  isSelecting,
  selections,
  onLoadSuccess,
  onLoadError,
  onSelectionCreate,
  onSelectionEdit
}: FilePDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null)
  const [currentSelection, setCurrentSelection] = useState<{ x: number, y: number, width: number, height: number } | null>(null)
  
  // Resize state
  const [isResizing, setIsResizing] = useState(false)
  const [resizingSelectionId, setResizingSelectionId] = useState<string | null>(null)
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null)
  const [resizeStartPoint, setResizeStartPoint] = useState<{ x: number, y: number } | null>(null)
  const [originalSelection, setOriginalSelection] = useState<Selection | null>(null)

  // Handle mouse events for selection creation
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !onSelectionCreate || !pageRef.current || isResizing) return
    
    const rect = pageRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale
    
    setIsDrawing(true)
    setStartPoint({ x, y })
    setCurrentSelection({ x, y, width: 0, height: 0 })
  }, [isSelecting, onSelectionCreate, scale, isResizing])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDrawing && startPoint && pageRef.current && !isResizing) {
      const rect = pageRef.current.getBoundingClientRect()
      const currentX = (e.clientX - rect.left) / scale
      const currentY = (e.clientY - rect.top) / scale
      
      setCurrentSelection({
        x: Math.min(startPoint.x, currentX),
        y: Math.min(startPoint.y, currentY),
        width: Math.abs(currentX - startPoint.x),
        height: Math.abs(currentY - startPoint.y)
      })
    } else if (isResizing && resizeStartPoint && originalSelection && pageRef.current) {
      const rect = pageRef.current.getBoundingClientRect()
      const currentX = (e.clientX - rect.left) / scale
      const currentY = (e.clientY - rect.top) / scale
      
      const deltaX = currentX - resizeStartPoint.x
      const deltaY = currentY - resizeStartPoint.y
      
      let newSelection = { ...originalSelection }
      
      switch (resizeHandle) {
        case 'top-left':
          newSelection.x = originalSelection.x + deltaX
          newSelection.y = originalSelection.y + deltaY
          newSelection.width = originalSelection.width - deltaX
          newSelection.height = originalSelection.height - deltaY
          break
        case 'top-right':
          newSelection.y = originalSelection.y + deltaY
          newSelection.width = originalSelection.width + deltaX
          newSelection.height = originalSelection.height - deltaY
          break
        case 'bottom-left':
          newSelection.x = originalSelection.x + deltaX
          newSelection.width = originalSelection.width - deltaX
          newSelection.height = originalSelection.height + deltaY
          break
        case 'bottom-right':
          newSelection.width = originalSelection.width + deltaX
          newSelection.height = originalSelection.height + deltaY
          break
      }
      
      // Ensure minimum size
      if (newSelection.width < 10) {
        if (resizeHandle === 'top-left' || resizeHandle === 'bottom-left') {
          newSelection.x = originalSelection.x + originalSelection.width - 10
        }
        newSelection.width = 10
      }
      if (newSelection.height < 10) {
        if (resizeHandle === 'top-left' || resizeHandle === 'top-right') {
          newSelection.y = originalSelection.y + originalSelection.height - 10
        }
        newSelection.height = 10
      }
      
      if (onSelectionEdit) {
        onSelectionEdit(resizingSelectionId!, {
          x: newSelection.x,
          y: newSelection.y,
          width: newSelection.width,
          height: newSelection.height
        })
      }
    }
  }, [isDrawing, startPoint, scale, isResizing, resizeStartPoint, originalSelection, resizeHandle, resizingSelectionId, onSelectionEdit])

  const handleMouseUp = useCallback(() => {
    if (isDrawing && currentSelection && onSelectionCreate) {
      // Only create selection if it has meaningful size
      if (currentSelection.width > 10 && currentSelection.height > 10) {
        onSelectionCreate({
          pageNumber: currentPage,
          x: currentSelection.x,
          y: currentSelection.y,
          width: currentSelection.width,
          height: currentSelection.height
        })
      }
      
      setIsDrawing(false)
      setStartPoint(null)
      setCurrentSelection(null)
    } else if (isResizing) {
      setIsResizing(false)
      setResizingSelectionId(null)
      setResizeHandle(null)
      setResizeStartPoint(null)
      setOriginalSelection(null)
    }
  }, [isDrawing, currentSelection, onSelectionCreate, currentPage, isResizing])

  // Handle resize start
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, selectionId: string, handle: ResizeHandle) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!pageRef.current || !onSelectionEdit) return
    
    const rect = pageRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale
    
    const selection = selections.find(s => s.id === selectionId)
    if (!selection) return
    
    setIsResizing(true)
    setResizingSelectionId(selectionId)
    setResizeHandle(handle)
    setResizeStartPoint({ x, y })
    setOriginalSelection(selection)
  }, [scale, selections, onSelectionEdit])

  // Add global mouse event listeners for smooth dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isResizing && pageRef.current) {
        const rect = pageRef.current.getBoundingClientRect()
        const currentX = (e.clientX - rect.left) / scale
        const currentY = (e.clientY - rect.top) / scale
        
        if (resizeStartPoint && originalSelection) {
          const deltaX = currentX - resizeStartPoint.x
          const deltaY = currentY - resizeStartPoint.y
          
          let newSelection = { ...originalSelection }
          
          switch (resizeHandle) {
            case 'top-left':
              newSelection.x = originalSelection.x + deltaX
              newSelection.y = originalSelection.y + deltaY
              newSelection.width = originalSelection.width - deltaX
              newSelection.height = originalSelection.height - deltaY
              break
            case 'top-right':
              newSelection.y = originalSelection.y + deltaY
              newSelection.width = originalSelection.width + deltaX
              newSelection.height = originalSelection.height - deltaY
              break
            case 'bottom-left':
              newSelection.x = originalSelection.x + deltaX
              newSelection.width = originalSelection.width - deltaX
              newSelection.height = originalSelection.height + deltaY
              break
            case 'bottom-right':
              newSelection.width = originalSelection.width + deltaX
              newSelection.height = originalSelection.height + deltaY
              break
          }
          
          // Ensure minimum size
          if (newSelection.width < 10) {
            if (resizeHandle === 'top-left' || resizeHandle === 'bottom-left') {
              newSelection.x = originalSelection.x + originalSelection.width - 10
            }
            newSelection.width = 10
          }
          if (newSelection.height < 10) {
            if (resizeHandle === 'top-left' || resizeHandle === 'top-right') {
              newSelection.y = originalSelection.y + originalSelection.height - 10
            }
            newSelection.height = 10
          }
          
          if (onSelectionEdit) {
            onSelectionEdit(resizingSelectionId!, {
              x: newSelection.x,
              y: newSelection.y,
              width: newSelection.width,
              height: newSelection.height
            })
          }
        }
      }
    }

    const handleGlobalMouseUp = () => {
      if (isResizing) {
        setIsResizing(false)
        setResizingSelectionId(null)
        setResizeHandle(null)
        setResizeStartPoint(null)
        setOriginalSelection(null)
      }
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isResizing, resizeStartPoint, originalSelection, resizeHandle, resizingSelectionId, onSelectionEdit, scale])

  // Get selections for current page
  const currentPageSelections = selections.filter(s => s.pageNumber === currentPage)

  return (
    <div className="flex-1 overflow-hidden bg-muted/50">
      <ScrollArea className="h-full">
        <div 
          ref={containerRef}
          className="flex justify-center items-start p-6 min-h-full"
        >
          {error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center max-w-md">
                <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Error Loading PDF</h3>
                <p className="text-muted-foreground text-sm">{error}</p>
              </div>
            </div>
          ) : !fileUrl ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No PDF to Display</h3>
                <p className="text-muted-foreground text-sm">
                  PDF file not available
                </p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded" style={{ zIndex: 5 }}>
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading PDF...</p>
                  </div>
                </div>
              )}
              
              <div 
                ref={pageRef}
                className="relative"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <PDFDocument
                  file={fileUrl}
                  onLoadSuccess={onLoadSuccess}
                  onLoadError={onLoadError}
                  loading=""
                  className="pdf-document"
                >
                  <Page
                    key={`page_${currentPage}_${scale}`}
                    pageNumber={currentPage}
                    scale={scale}
                    loading=""
                    className="pdf-page shadow-lg"
                    canvasBackground="white"
                    renderTextLayer={!isSelecting}
                  />
                </PDFDocument>

                {/* Existing selections */}
                {currentPageSelections.map((selection) => (
                  <div
                    key={selection.id}
                    className="absolute border-2 border-blue-500 bg-blue-500/20"
                    style={{
                      left: `${selection.x * scale}px`,
                      top: `${selection.y * scale}px`,
                      width: `${selection.width * scale}px`,
                      height: `${selection.height * scale}px`,
                      pointerEvents: onSelectionEdit ? 'auto' : 'none',
                      zIndex: 10
                    }}
                  >
                    {/* Corner handles */}
                    {onSelectionEdit && (
                      <>
                        {/* Top-left handle */}
                        <div
                          className="absolute bg-blue-600 border-2 border-white cursor-nw-resize hover:bg-blue-700 rounded-sm"
                          style={{
                            left: '-6px',
                            top: '-6px',
                            width: '12px',
                            height: '12px',
                            pointerEvents: 'auto',
                            zIndex: 20
                          }}
                          onMouseDown={(e) => handleResizeMouseDown(e, selection.id, 'top-left')}
                        />
                        
                        {/* Top-right handle */}
                        <div
                          className="absolute bg-blue-600 border-2 border-white cursor-ne-resize hover:bg-blue-700 rounded-sm"
                          style={{
                            right: '-6px',
                            top: '-6px',
                            width: '12px',
                            height: '12px',
                            pointerEvents: 'auto',
                            zIndex: 20
                          }}
                          onMouseDown={(e) => handleResizeMouseDown(e, selection.id, 'top-right')}
                        />
                        
                        {/* Bottom-left handle */}
                        <div
                          className="absolute bg-blue-600 border-2 border-white cursor-sw-resize hover:bg-blue-700 rounded-sm"
                          style={{
                            left: '-6px',
                            bottom: '-6px',
                            width: '12px',
                            height: '12px',
                            pointerEvents: 'auto',
                            zIndex: 20
                          }}
                          onMouseDown={(e) => handleResizeMouseDown(e, selection.id, 'bottom-left')}
                        />
                        
                        {/* Bottom-right handle */}
                        <div
                          className="absolute bg-blue-600 border-2 border-white cursor-se-resize hover:bg-blue-700 rounded-sm"
                          style={{
                            right: '-6px',
                            bottom: '-6px',
                            width: '12px',
                            height: '12px',
                            pointerEvents: 'auto',
                            zIndex: 20
                          }}
                          onMouseDown={(e) => handleResizeMouseDown(e, selection.id, 'bottom-right')}
                        />
                      </>
                    )}
                  </div>
                ))}

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
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
