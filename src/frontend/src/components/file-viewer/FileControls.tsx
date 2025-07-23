import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Square
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FileControlsProps {
  currentPage: number
  numPages: number
  scale: number
  isSelecting: boolean
  onPageChange: (page: number) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onRotate: () => void
  onToggleSelection: () => void
  onDownload: () => void
}

export function FileControls({
  currentPage,
  numPages,
  scale,
  isSelecting,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onRotate,
  onToggleSelection,
  onDownload
}: FileControlsProps) {
  return (
    <div className="flex-shrink-0 p-6 border-b">
      <h3 className="text-sm font-medium mb-4">PDF Controls</h3>
      
      {/* Navigation */}
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Page Navigation</label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1 px-3 py-1 bg-muted rounded text-sm">
              <span className="font-medium">{currentPage}</span>
              <span className="text-muted-foreground">of</span>
              <span className="font-medium">{numPages}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= numPages}
              className="flex-1"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Zoom Controls */}
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Zoom Level</label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onZoomOut}
              disabled={scale <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <div className="flex-1 text-center px-2 py-1 bg-muted rounded text-sm font-medium">
              {Math.round(scale * 100)}%
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onZoomIn}
              disabled={scale >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Other Controls */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRotate}
            className="flex-1"
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Rotate
          </Button>

          <Button
            variant={isSelecting ? "default" : "outline"}
            size="sm"
            onClick={onToggleSelection}
            className="flex-1"
          >
            <Square className="h-4 w-4 mr-2" />
            Select
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onDownload}
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    </div>
  )
}
