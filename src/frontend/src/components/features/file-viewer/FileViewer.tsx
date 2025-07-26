import { Renderer } from './Renderer'

interface Selection {
  id: string
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
  text?: string
}

interface FileViewerProps {
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

export function FileViewer({
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
}: FileViewerProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Renderer
        fileUrl={fileUrl}
        currentPage={currentPage}
        scale={scale}
        isLoading={isLoading}
        error={error}
        isSelecting={isSelecting}
        selections={selections}
        activeSelectionId={activeSelectionId}
        onLoadSuccess={onLoadSuccess}
        onLoadError={onLoadError}
        onAutoFitScale={onAutoFitScale}
        onSelectionCreate={onSelectionCreate}
        onSelectionEdit={onSelectionEdit}
      />
    </div>
  )
}
