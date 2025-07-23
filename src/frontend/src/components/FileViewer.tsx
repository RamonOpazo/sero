"use client"

import { useState, useCallback, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { pdfjs } from 'react-pdf'
import { FileText, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Document as DocumentType } from '@/types'

// Import sub-components
import { FileHeader } from './file-viewer/FileHeader'
import { FileControls } from './file-viewer/FileControls'
import { FileSelectionInfo } from './file-viewer/FileSelectionInfo'
import { FilePDFViewer } from './file-viewer/FilePDFViewer'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface Selection {
  id: string
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
  text?: string
}

export function FileViewer() {
  const { documentId, fileId } = useParams<{ projectId: string; documentId: string; fileId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [documentData, setDocumentData] = useState<DocumentType | null>(null)
  const [isDocumentLoading, setIsDocumentLoading] = useState(true)
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.2)
  const [rotation, setRotation] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selections, setSelections] = useState<Selection[]>([])
  const [isSelecting, setIsSelecting] = useState<boolean>(false)
  const password = searchParams.get('password') || ''
  
  // Get view mode from URL params, default to 'original'
  const viewMode = (searchParams.get('view') as 'original' | 'obfuscated') || 'original'

  // Load document data
  useEffect(() => {
    if (!documentId) return

    setIsDocumentLoading(true)
    fetch(`/api/documents/id/${documentId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        return res.json()
      })
      .then(data => {
        setDocumentData(data)
        setIsDocumentLoading(false)
        // Load existing selections
        if (data.original_file?.selections) {
          setSelections(data.original_file.selections)
        }
      })
      .catch(err => {
        console.error('Error fetching document:', err)
        setIsDocumentLoading(false)
      })
  }, [documentId])

  const handleViewModeChange = (mode: 'original' | 'obfuscated') => {
    if (mode === 'original') {
      searchParams.delete('view')
    } else {
      searchParams.set('view', mode)
    }
    setSearchParams(searchParams)
  }

  // Get the appropriate file based on fileId parameter or view mode
  const file = fileId 
    ? (documentData?.original_file?.id === fileId ? documentData.original_file : documentData?.obfuscated_file)
    : (viewMode === 'obfuscated' && documentData?.obfuscated_file 
        ? documentData.obfuscated_file 
        : documentData?.original_file)

  // Create file URL with streaming and password
  const createFileUrl = useCallback(() => {
    if (!file) return null
    // Use fileId if provided, otherwise use file.id
    const actualFileId = fileId || file.id
    const url = new URL(`/api/files/id/${actualFileId}/download`, window.location.origin)
    url.searchParams.set('stream', 'true')
    if (password.trim()) {
      url.searchParams.set('password', password)
    }
    return url.toString()
  }, [file, fileId, password])

  const fileUrl = createFileUrl()

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
    setError(null)
  }, [])

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev * 1.2, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev / 1.2, 0.5))
  }, [])

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360)
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, numPages)))
  }, [numPages])

  const handleDownload = useCallback(() => {
    if (fileUrl) {
      const link = window.document.createElement('a')
      link.href = fileUrl
      link.download = file?.filename || 'document.pdf'
      link.click()
    }
  }, [fileUrl, file])

  const toggleSelectionMode = useCallback(() => {
    setIsSelecting(prev => !prev)
  }, [])

  const onDocumentLoadError = useCallback((error: Error) => {
    setError(error.message)
    setIsLoading(false)
  }, [])

  const handleClearSelections = useCallback(() => {
    setSelections([])
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }
      
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault()
          handlePageChange(currentPage - 1)
          break
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault()
          handlePageChange(currentPage + 1)
          break
        case '+':
        case '=':
          event.preventDefault()
          handleZoomIn()
          break
        case '-':
          event.preventDefault()
          handleZoomOut()
          break
        case 'r':
        case 'R':
          event.preventDefault()
          handleRotate()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, handlePageChange, handleZoomIn, handleZoomOut, handleRotate])

  // Document loading state
  if (isDocumentLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    )
  }

  // Document not found
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

  // No file available
  if (!file) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Document Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold mb-2 truncate">
                {documentData.original_file?.filename || documentData.description || 'Untitled Document'}
              </h1>
              {documentData.description && (
                <p className="text-muted-foreground mb-3">{documentData.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>Status:</span>
                  <Badge 
                    variant={documentData.status === 'processed' ? 'default' : 
                            documentData.status === 'pending' ? 'secondary' : 'destructive'}
                  >
                    {documentData.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* View mode switcher */}
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant={viewMode === 'original' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleViewModeChange('original')}
                disabled={!documentData.original_file}
              >
                <Eye className="h-4 w-4 mr-2" />
                Original
              </Button>
              
              <Button
                variant={viewMode === 'obfuscated' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleViewModeChange('obfuscated')}
                disabled={!documentData.obfuscated_file}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Obfuscated
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center h-full bg-muted/10">
          <div className="text-center">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No File Available</h3>
            <p className="text-muted-foreground">
              {viewMode === 'obfuscated' 
                ? 'No obfuscated version of this document exists.'
                : 'This document does not have an associated file.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* Left Panel - Document Info and Tools */}
      <div className="w-80 flex-shrink-0 border-r bg-muted/10 flex flex-col">
        <FileHeader
          documentData={documentData}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />

        <FileControls
          currentPage={currentPage}
          numPages={numPages}
          scale={scale}
          isSelecting={isSelecting}
          onPageChange={handlePageChange}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onRotate={handleRotate}
          onToggleSelection={toggleSelectionMode}
          onDownload={handleDownload}
        />

        <FileSelectionInfo
          selections={selections}
          onClearSelections={handleClearSelections}
        />

        <div className="flex-1" /> {/* Spacer */}
      </div>

      {/* Right Panel - PDF Viewer */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <FilePDFViewer
          fileUrl={fileUrl}
          currentPage={currentPage}
          scale={scale}
          rotation={rotation}
          isLoading={isLoading}
          error={error}
          isSelecting={isSelecting}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
        />
      </div>
    </div>
  )
}
