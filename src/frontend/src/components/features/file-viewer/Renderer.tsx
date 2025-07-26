import { useRef, useState, useCallback, useEffect } from 'react'
import { Document as PDFDocument, Page } from 'react-pdf'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, AlertCircle, Loader2 } from 'lucide-react'
import { SelectionLayer } from './SelectionLayer'

interface Selection {
  id: string
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
  text?: string
}

interface RendererProps {
  fileUrl: string | null
  currentPage: number
  scale: number
  isLoading: boolean
  error: string | null
  isSelecting: boolean
  selections: Selection[]
  activeSelectionId?: string | null
  onLoadSuccess: ({ numPages }: { numPages: number }) => void
  onLoadError: (error: Error) => void
  onAutoFitScale?: (scale: number) => void
  onSelectionCreate?: (selection: Omit<Selection, 'id'>) => void
  onSelectionEdit?: (id: string, updates: Partial<Selection>) => void
}

type ResizeHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export function Renderer({
  fileUrl,
  currentPage,
  scale,
  isLoading,
  error,
  isSelecting,
  selections,
  activeSelectionId,
  onLoadSuccess,
  onLoadError,
  onAutoFitScale,
  onSelectionCreate,
  onSelectionEdit
}: RendererProps) {
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
  const [pageDimensions, setPageDimensions] = useState<{ width: number, height: number } | null>(null)

  // Helper functions for coordinate conversion
  const pixelToNormalized = useCallback((pixelCoords: { x: number, y: number, width: number, height: number }) => {
    if (!pageDimensions) return pixelCoords
    return {
      x: pixelCoords.x / pageDimensions.width,
      y: pixelCoords.y / pageDimensions.height,
      width: pixelCoords.width / pageDimensions.width,
      height: pixelCoords.height / pageDimensions.height
    }
  }, [pageDimensions])

  // Helper function to convert normalized coordinates to pixel coordinates (currently unused)
  // const normalizedToPixel = (normalizedCoords: { x: number, y: number, width: number, height: number }) => {
  //   if (!pageDimensions) return normalizedCoords
  //   return {
  //     x: normalizedCoords.x * pageDimensions.width,
  //     y: normalizedCoords.y * pageDimensions.height,
  //     width: normalizedCoords.width * pageDimensions.width,
  //     height: normalizedCoords.height * pageDimensions.height
  //   }
  // }

  // Update page dimensions when page loads and calculate auto-fit scale
  const handlePageLoadSuccess = useCallback((page: any) => {
    const viewport = page.getViewport({ scale: 1 }) // Get unscaled dimensions
    setPageDimensions({
      width: viewport.width,
      height: viewport.height
    })
    
    // Calculate scale to fit vertically in the container
    if (containerRef.current && pageRef.current && scale === 1.0) { // Only auto-fit on initial load
      // Instead of hardcoding padding, measure the actual available space
      // by getting the content area where the PDF will be rendered
      const contentArea = pageRef.current.getBoundingClientRect()
      
      // Use the actual content area height - this automatically accounts for all padding, margins, etc.
      const availableHeight = contentArea.height
      const autoFitScale = Math.min(availableHeight / viewport.height, 2.0) // Cap at 2x zoom
      
      console.log(`Auto-fit debug: content area height=${availableHeight}px, page height=${viewport.height}px, calculated scale=${autoFitScale.toFixed(3)}`)
      
      if (autoFitScale > 0.3 && autoFitScale !== 1.0 && onAutoFitScale) {
        // Only apply auto-fit if it's a reasonable scale
        console.log('Auto-fit: Applying scale', autoFitScale.toFixed(3))
        onAutoFitScale(autoFitScale)
      }
    }
  }, [scale, onAutoFitScale])

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
        // Convert pixel coordinates to normalized coordinates
        const normalizedSelection = pixelToNormalized(currentSelection)
        onSelectionCreate({
          pageNumber: currentPage,
          x: normalizedSelection.x,
          y: normalizedSelection.y,
          width: normalizedSelection.width,
          height: normalizedSelection.height
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
  }, [isDrawing, currentSelection, onSelectionCreate, currentPage, isResizing, pixelToNormalized])

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
  // Get selections for current page (currently unused)
  // const currentPageSelections = selections.filter(s => s.pageNumber === currentPage)

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-muted/50">
      <ScrollArea className="flex-1">
        <div 
          ref={containerRef}
          className="flex justify-center items-start p-6 h-full"
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
                className="relative w-full h-full"
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
                    onLoadSuccess={handlePageLoadSuccess}
                  />
                </PDFDocument>

                <SelectionLayer
                  selections={selections}
                  currentPage={currentPage}
                  activeSelectionId={activeSelectionId}
                  scale={scale}
                  isSelecting={isSelecting}
                  isResizing={isResizing}
                  currentSelection={currentSelection}
                  pageDimensions={pageDimensions}
                  onSelectionEdit={onSelectionEdit}
                  onResizeStart={handleResizeMouseDown}
                />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
