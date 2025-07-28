import {
  ZoomIn,
  ZoomOut,
  Download,
  ChevronLeft,
  ChevronRight,
  Trash,
  Zap,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NavigationPanelProps {
  currentPage: number
  numPages: number
  scale: number
  isOriginalFile: boolean
  canObfuscate: boolean
  isObfuscating?: boolean
  onPageChange: (page: number) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onDownload: () => void
  onObfuscate: () => void
  onDelete: () => void
}

export function NavigationPanel({
  currentPage,
  numPages,
  scale,
  isOriginalFile,
  canObfuscate,
  isObfuscating = false,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onDownload,
  onObfuscate,
  onDelete
}: NavigationPanelProps) {
  return (
    <div className="flex-shrink-0">
      <h3 className="text-sm font-medium mb-4">Document Controls</h3>
      
      {/* Navigation */}
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Page Navigation</label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center justify-center px-3 py-1 bg-muted rounded text-sm">
              <span className="font-medium">{currentPage}</span>
              <span className="text-muted-foreground mx-1">of</span>
              <span className="font-medium">{numPages}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= numPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Zoom Controls */}
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Zoom Level</label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onZoomOut}
              disabled={scale <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center justify-center px-3 py-1 bg-muted rounded text-sm font-medium">
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

        {/* Action Buttons */}
        <div className="flex flex-1 flex-col">
          <label className="text-xs text-muted-foreground mb-2 block">Actions</label>
          <div className="flex flex-col items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>

            {isOriginalFile && (
              <Button
                variant="default"
                size="sm"
                onClick={onObfuscate}
                disabled={!canObfuscate || isObfuscating}
                className="w-full"
              >
                {isObfuscating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Obfuscate
                  </>
                )}
              </Button>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              className="w-full"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
