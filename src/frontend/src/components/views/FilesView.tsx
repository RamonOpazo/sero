import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { getPassword } from '@/utils/passwordManager'
import { FileController } from '@/components/features/file-controller'
import { FileViewer } from '@/components/features/file-viewer'
import type { Document as DocumentType } from '@/types'
import {
  Widget,
  WidgetContainer,
  WidgetContent,
  // WidgetDescription,
  // WidgetHeader,
  // WidgetTitle,
} from "@/components/atomic/Widget"

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

export function FilesView() {
  const { documentId, fileId } = useParams<{ projectId: string; documentId: string; fileId?: string }>()
  const [documentData, setDocumentData] = useState<DocumentType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'original' | 'obfuscated'>('original')
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  
  // PDF viewer state
  const [currentPage, setCurrentPage] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.0)
  const [pdfError, setPdfError] = useState<string | null>(null)
  
  // Selection and editing state
  const [selections, setSelections] = useState<Selection[]>([])
  const [prompts] = useState<Prompt[]>([])
  const [activeSelectionId, setActiveSelectionId] = useState<string | null>(null)
  const [isSelecting] = useState(false)

  useEffect(() => {
    if (!documentId) return

    fetch(`/api/documents/id/${documentId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        return res.json()
      })
      .then(data => {
        console.log('Document loaded:', data.name)
        setDocumentData(data)
        setIsLoading(false)
      })
      .catch(err => {
        console.error('Error fetching document:', err)
        toast.error('Failed to load document', {
          description: 'Please refresh the page to try again.'
        })
        setIsLoading(false)
      })
  }, [documentId])

// Set view mode based on specific fileId in URL
  useEffect(() => {
    if (!documentData || !fileId) return
    
    // If we have a specific fileId in the URL, determine which view mode to use
    if (documentData.original_file?.id === fileId) {
      setViewMode('original')
    } else if (documentData.redacted_file?.id === fileId) {
      setViewMode('obfuscated')
    }
  }, [documentData, fileId])

  useEffect(() => {
    if (!documentData || !documentId) return

    const currentFile = viewMode === 'original' ? documentData.original_file : documentData.redacted_file
    if (!currentFile) {
      setFileUrl(null)
      return
    }

    const password = getPassword(documentId, currentFile.id)
    if (!password) {
      toast.error('Missing password for file access')
      return
    }

    // Use the download endpoint with stream=true for inline PDF viewing (react-pdf compatible)
    const fileUrl = `/api/files/id/${currentFile.id}/download?password=${encodeURIComponent(password)}&stream=true`
    setFileUrl(fileUrl)
  }, [documentData, documentId, viewMode])

  // Event handlers for FileController
  const handleViewModeChange = (mode: 'original' | 'obfuscated') => {
    setViewMode(mode)
    setCurrentPage(1) // Reset to first page when switching modes
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0))
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5))
  }

  const handleDownload = () => {
    if (!currentFile || !documentData || !documentId) return
    
    const password = getPassword(documentId, currentFile.id)
    if (!password) {
      toast.error('Missing password for download')
      return
    }

    const downloadUrl = `/api/files/id/${currentFile.id}/download?password=${encodeURIComponent(password)}`
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = documentData.name
    link.click()
  }

  const handleObfuscate = () => {
    // TODO: Implement obfuscation logic
    toast.info('Obfuscation feature coming soon')
  }

  const handleDelete = () => {
    // TODO: Implement delete logic
    toast.info('Delete feature coming soon')
  }

  const handleClearSelections = () => {
    setSelections([])
    setActiveSelectionId(null)
  }

  // Event handlers for FileViewer
  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPdfError(null)
  }

  const handleLoadError = (error: Error) => {
    setPdfError(error.message)
    console.error('PDF load error:', error)
  }

  const handleSelectionCreate = (selection: Omit<Selection, 'id'>) => {
    const newSelection = {
      ...selection,
      id: crypto.randomUUID()
    }
    setSelections(prev => [...prev, newSelection])
  }

  const handleSelectionEdit = (id: string, updates: Partial<Selection>) => {
    setSelections(prev => prev.map(sel => 
      sel.id === id ? { ...sel, ...updates } : sel
    ))
  }

  const handleSelectionDelete = (id: string) => {
    setSelections(prev => prev.filter(sel => sel.id !== id))
    if (activeSelectionId === id) {
      setActiveSelectionId(null)
    }
  }

  const handleSelectionActivate = (id: string) => {
    setActiveSelectionId(id)
  }

  const handleAutoFitScale = (autoScale: number) => {
    setScale(autoScale)
  }

  const currentFile = viewMode === 'original' ? documentData?.original_file : documentData?.redacted_file
  const isOriginalFile = viewMode === 'original'
  const canObfuscate = isOriginalFile && selections.length > 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    )
  }

  if (!documentData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Document Not Found</h3>
          <p className="text-muted-foreground">The requested document could not be loaded.</p>
        </div>
      </div>
    )
  }

  if (!currentFile) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No File Available</h3>
          <p className="text-muted-foreground">
            {viewMode === 'obfuscated' 
              ? 'No redacted version of this document exists.'
              : 'This document does not have an associated file.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <WidgetContainer>
      <Widget expanded className="justify-center">
        <WidgetContent>
          <FileViewer
            fileUrl={fileUrl}
            currentPage={currentPage}
            scale={scale}
            isLoading={!fileUrl}
            error={pdfError}
            isSelecting={isSelecting}
            selections={selections}
            activeSelectionId={activeSelectionId}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={handleLoadError}
            onAutoFitScale={handleAutoFitScale}
            onSelectionCreate={handleSelectionCreate}
            onSelectionEdit={handleSelectionEdit}
          />
        </WidgetContent>
      </Widget>
      
      <Widget>
        <WidgetContent>
          <FileController
            documentData={documentData}
            viewMode={viewMode}
            isOriginalFile={isOriginalFile}
            fileId={currentFile?.id}
            currentPage={currentPage}
            numPages={numPages}
            scale={scale}
            selections={selections}
            prompts={prompts}
            canObfuscate={canObfuscate}
            activeSelectionId={activeSelectionId}
            onViewModeChange={handleViewModeChange}
            onPageChange={handlePageChange}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onDownload={handleDownload}
            onObfuscate={handleObfuscate}
            onDelete={handleDelete}
            onClearSelections={handleClearSelections}
            onSelectionDelete={handleSelectionDelete}
            onSelectionActivate={handleSelectionActivate}
          />
        </WidgetContent>
      </Widget>
    </WidgetContainer>
  )
}
