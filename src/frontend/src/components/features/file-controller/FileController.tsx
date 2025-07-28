import type { Document as DocumentType } from '@/types'
import { DocumentHeader } from './DocumentHeader'
import { NavigationPanel } from './NavigationPanel'
import { EditingPanel } from './EditingPanel'
import { Separator } from '@/components/ui/separator'

interface Selection {
  id: string
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
  text?: string
}

interface Prompt {
  id: string
  text: string
  label?: string
  languages: string[]
  temperature: number
  createdAt: string
  updatedAt?: string
}

interface FileControllerProps {
  // Document and file info
  documentData: DocumentType
  viewMode: 'original' | 'obfuscated'
  isOriginalFile: boolean
  fileId?: string
  
  // PDF state
  currentPage: number
  numPages: number
  scale: number
  
  // Editing state
  selections: Selection[]
  prompts: Prompt[]
  isLoadingFileData?: boolean
  backendSelectionsCount?: number
  backendPromptsCount?: number
  activeSelectionId?: string | null
  
  // Actions
  canObfuscate: boolean
  isObfuscating?: boolean
  
  // Event handlers
  onViewModeChange: (mode: 'original' | 'obfuscated') => void
  onPageChange: (page: number) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onDownload: () => void
  onObfuscate: () => void
  onDelete: () => void
  onClearSelections: () => void
  onSelectionDelete?: (id: string) => void
  onSelectionActivate?: (id: string) => void
}

export function FileController({
  documentData,
  viewMode,
  isOriginalFile,
  fileId,
  currentPage,
  numPages,
  scale,
  selections,
  prompts,
  isLoadingFileData,
  backendSelectionsCount,
  backendPromptsCount,
  activeSelectionId,
  canObfuscate,
  isObfuscating,
  onViewModeChange,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onDownload,
  onObfuscate,
  onDelete,
  onClearSelections,
  onSelectionDelete,
  onSelectionActivate
}: FileControllerProps) {
  return (
    <div className="flex flex-col gap-4 flex-shrink-0 h-full w-(--sidebar-width)">
      <DocumentHeader
        documentData={documentData}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />

      <Separator/ >

      <NavigationPanel
        currentPage={currentPage}
        numPages={numPages}
        scale={scale}
        isOriginalFile={isOriginalFile}
        canObfuscate={canObfuscate}
        isObfuscating={isObfuscating}
        onPageChange={onPageChange}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onDownload={onDownload}
        onObfuscate={onObfuscate}
        onDelete={onDelete}
      />

      <Separator/ >

      <EditingPanel
        selections={selections}
        prompts={prompts}
        isOriginalFile={isOriginalFile}
        fileId={fileId}
        isLoadingFileData={isLoadingFileData}
        backendSelectionsCount={backendSelectionsCount}
        backendPromptsCount={backendPromptsCount}
        activeSelectionId={activeSelectionId}
        onClearSelections={onClearSelections}
        onSelectionDelete={onSelectionDelete}
        onSelectionActivate={onSelectionActivate}
        onPageChange={onPageChange}
      />
    </div>
  )
}
