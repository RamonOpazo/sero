import { useRef } from 'react'
import { Document as PDFDocument, Page } from 'react-pdf'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, AlertCircle, Loader2 } from 'lucide-react'

interface FilePDFViewerProps {
  fileUrl: string | null
  currentPage: number
  scale: number
  rotation: number
  isLoading: boolean
  error: string | null
  isSelecting: boolean
  onLoadSuccess: ({ numPages }: { numPages: number }) => void
  onLoadError: (error: Error) => void
}

export function FilePDFViewer({
  fileUrl,
  currentPage,
  scale,
  rotation,
  isLoading,
  error,
  isSelecting,
  onLoadSuccess,
  onLoadError
}: FilePDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex-1 overflow-hidden bg-gray-100">
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
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 rounded">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading PDF...</p>
                  </div>
                </div>
              )}
              
              <PDFDocument
                file={fileUrl}
                onLoadSuccess={onLoadSuccess}
                onLoadError={onLoadError}
                loading=""
                className="pdf-document"
              >
                <Page
                  key={`page_${currentPage}_${scale}_${rotation}`}
                  pageNumber={currentPage}
                  scale={scale}
                  rotate={rotation}
                  loading=""
                  className="pdf-page shadow-lg"
                  canvasBackground="white"
                />
              </PDFDocument>

              {/* Selection overlays */}
              {isSelecting && (
                <div className="absolute inset-0 cursor-crosshair" />
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
