"use client"

import { useState, useCallback, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { pdfjs } from 'react-pdf'
import { FileText, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmationDialog } from './ConfirmationDialog'
import { getPassword, extendPasswordExpiry, cleanupExpiredPasswords } from '@/utils/passwordManager'
import { throttle } from '@/utils/functions'
import type { Document as DocumentType } from '@/types'

// Import sub-components
import { FileHeader } from './file-viewer/FileHeader'
import { FileControls } from './file-viewer/FileControls'
import { FileEditing } from './file-viewer/FileEditing'
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

interface Prompt {
  id: string
  text: string
  label?: string
  languages: string[]
  temperature: number
  createdAt: string
  updatedAt?: string
}

export function FileViewer() {
  const { documentId, fileId } = useParams<{ projectId: string; documentId: string; fileId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [documentData, setDocumentData] = useState<DocumentType | null>(null)
  const [isDocumentLoading, setIsDocumentLoading] = useState(true)
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.2)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selections, setSelections] = useState<Selection[]>([])
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [isLoadingFileData, setIsLoadingFileData] = useState(false)
  const [activeSelectionId, setActiveSelectionId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  // Get view mode from URL params, default to 'original'
  const viewMode = (searchParams.get('view') as 'original' | 'obfuscated') || 'original'
  
  // Get password from secure storage instead of URL parameters
  const getSecurePassword = useCallback((fileId?: string) => {
    if (!documentId || !fileId) return ''
    return getPassword(documentId, fileId) || ''
  }, [documentId])
  
  // Get the appropriate file based on fileId parameter or view mode
  const file = fileId 
    ? (documentData?.original_file?.id === fileId ? documentData.original_file : documentData?.obfuscated_file)
    : (viewMode === 'obfuscated' && documentData?.obfuscated_file 
        ? documentData.obfuscated_file 
        : documentData?.original_file)
  
  // Determine if current file is the original (editable) version
  const isOriginalFile = fileId 
    ? documentData?.original_file?.id === fileId 
    : viewMode === 'original'

  // Load document data
  useEffect(() => {
    if (!documentId) return

    // Clean up expired passwords on component mount
    cleanupExpiredPasswords()
    
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
      })
      .catch(err => {
        console.error('Error fetching document:', err)
        setIsDocumentLoading(false)
      })
  }, [documentId])
  
  // Extend password expiry when user is actively using the document
  useEffect(() => {
    if (!documentId || !file?.id || !getSecurePassword(file.id)) return
    
    const extendPassword = () => {
      extendPasswordExpiry(documentId, file.id, 30) // Extend by 30 minutes
    }
    
    // Extend password on various user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    const throttledExtend = throttle(extendPassword, 5 * 60 * 1000) // Throttle to once every 5 minutes
    
    events.forEach(event => {
      document.addEventListener(event, throttledExtend)
    })
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledExtend)
      })
    }
  }, [documentId, file?.id, getSecurePassword])

  const handleViewModeChange = (mode: 'original' | 'obfuscated') => {
    if (mode === 'original') {
      searchParams.delete('view')
    } else {
      searchParams.set('view', mode)
    }
    setSearchParams(searchParams)
  }

  // Load file data (selections and prompts) when file changes
  useEffect(() => {
    const loadFileData = async () => {
      if (!file?.id || !isOriginalFile) {
        setSelections([])
        setPrompts([])
        return
      }

      setIsLoadingFileData(true)
      
      try {
        // Always load both selections and prompts when file changes
        const [selectionsResponse, promptsResponse] = await Promise.all([
          fetch(`/api/files/id/${file.id}/selections`),
          fetch(`/api/files/id/${file.id}/prompts`)
        ])

        if (selectionsResponse.ok) {
          const selectionsData = await selectionsResponse.json()
          // Transform backend selection format to frontend format (coordinates are already normalized)
          const transformedSelections = selectionsData.map((sel: any) => ({
            id: sel.id,
            pageNumber: sel.page_number || 1,
            x: sel.x, // Already normalized (0-1)
            y: sel.y, // Already normalized (0-1)
            width: sel.width, // Already normalized (0-1)
            height: sel.height, // Already normalized (0-1)
            text: sel.label
          }))
          setSelections(transformedSelections)
        } else {
          console.warn('Failed to load selections:', selectionsResponse.statusText)
          setSelections([])
        }

        if (promptsResponse.ok) {
          const promptsData = await promptsResponse.json()
          // Transform backend prompt format to frontend format
          const transformedPrompts = promptsData.map((prompt: any) => ({
            id: prompt.id,
            text: prompt.text,
            label: prompt.label,
            languages: prompt.languages,
            temperature: prompt.temperature,
            createdAt: prompt.created_at,
            updatedAt: prompt.updated_at
          }))
          setPrompts(transformedPrompts)
        } else {
          console.warn('Failed to load prompts:', promptsResponse.statusText)
          setPrompts([])
        }
      } catch (error) {
        console.error('Error loading file data:', error)
        setSelections([])
        setPrompts([])
      } finally {
        setIsLoadingFileData(false)
      }
    }

    loadFileData()
  }, [file?.id, isOriginalFile])

  // Create file URL with streaming and password from secure storage
  const createFileUrl = useCallback(() => {
    if (!file) return null
    // Use fileId if provided, otherwise use file.id
    const actualFileId = fileId || file.id
    const url = new URL(`/api/files/id/${actualFileId}/download`, window.location.origin)
    url.searchParams.set('stream', 'true')
    
    // Get password from secure storage
    const password = getSecurePassword(actualFileId)
    if (password.trim()) {
      url.searchParams.set('password', password)
    }
    return url.toString()
  }, [file, fileId, getSecurePassword])

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

  const onDocumentLoadError = useCallback((error: Error) => {
    setError(error.message)
    setIsLoading(false)
  }, [])

  const handleClearSelections = useCallback(() => {
    setSelections([])
  }, [])

  const handleSelectionCreate = useCallback((selection: Omit<Selection, 'id'>) => {
    const newSelection: Selection = {
      ...selection,
      id: crypto.randomUUID()
    }
    setSelections(prev => [...prev, newSelection])
    // Set the newly created selection as active
    setActiveSelectionId(newSelection.id)
  }, [])

  const handleSelectionEdit = useCallback((id: string, updates: Partial<Selection>) => {
    setSelections(prev => prev.map(sel => 
      sel.id === id ? { ...sel, ...updates } : sel
    ))
  }, [])

  const handleSelectionDelete = useCallback((id: string) => {
    setSelections(prev => prev.filter(sel => sel.id !== id))
    // Clear active selection if we're deleting the active one
    if (activeSelectionId === id) {
      setActiveSelectionId(null)
    }
  }, [activeSelectionId])

  const handleSelectionActivate = useCallback((selectionId: string) => {
    setActiveSelectionId(selectionId)
    
    // Find the selection and navigate to its page
    const selection = selections.find(sel => sel.id === selectionId)
    if (selection && selection.pageNumber !== currentPage) {
      handlePageChange(selection.pageNumber)
    }
  }, [selections, currentPage, handlePageChange])

  const handleObfuscate = useCallback(() => {
    // TODO: Implement obfuscation logic
    console.log('Obfuscate file requested')
  }, [])

  const handleDelete = useCallback(() => {
    setIsDeleteDialogOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!documentData || !documentId) return

    try {
      if (isOriginalFile) {
        // Delete the entire document (both files)
        const response = await fetch(`/api/documents/id/${documentId}`, {
          method: 'DELETE'
        })
        
        if (!response.ok) {
          throw new Error(`Failed to delete document: ${response.statusText}`)
        }
        
        // Navigate back to documents list
        window.location.href = '/'
      } else {
        // Delete only the obfuscated file
        const response = await fetch(`/api/files/id/${file?.id}`, {
          method: 'DELETE'
        })
        
        if (!response.ok) {
          throw new Error(`Failed to delete obfuscated file: ${response.statusText}`)
        }
        
        // Switch to original view since obfuscated file is deleted
        handleViewModeChange('original')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      // TODO: Show error toast notification
    }
  }, [documentData, documentId, isOriginalFile, file?.id, handleViewModeChange])

  // Determine if obfuscation is possible
  const canObfuscate = isOriginalFile && documentData?.status === 'processed'

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
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, handlePageChange, handleZoomIn, handleZoomOut])

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
      <div className="w-96 flex-shrink-0 border-r bg-muted/10 flex flex-col">
        <FileHeader
          documentData={documentData}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />

        <FileControls
          currentPage={currentPage}
          numPages={numPages}
          scale={scale}
          isOriginalFile={isOriginalFile}
          canObfuscate={canObfuscate}
          onPageChange={handlePageChange}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onDownload={handleDownload}
          onObfuscate={handleObfuscate}
          onDelete={handleDelete}
        />

        <FileEditing
          selections={selections}
          prompts={prompts}
          isOriginalFile={isOriginalFile}
          fileId={file?.id}
          isLoadingFileData={isLoadingFileData}
          backendSelectionsCount={file?.selection_count}
          backendPromptsCount={file?.prompt_count}
          activeSelectionId={activeSelectionId}
          onClearSelections={handleClearSelections}
          onSelectionDelete={handleSelectionDelete}
          onSelectionActivate={handleSelectionActivate}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Right Panel - PDF Viewer */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <FilePDFViewer
          fileUrl={fileUrl}
          currentPage={currentPage}
          scale={scale}
          isLoading={isLoading}
          error={error}
          isSelecting={isOriginalFile}
          selections={selections}
          activeSelectionId={activeSelectionId}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          onSelectionCreate={isOriginalFile ? handleSelectionCreate : undefined}
          onSelectionEdit={isOriginalFile ? handleSelectionEdit : undefined}
        />
      </div>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={isOriginalFile ? "Delete Document" : "Delete Obfuscated File"}
        description={isOriginalFile 
          ? "This action will permanently delete the entire document including both original and obfuscated files. This cannot be undone."
          : "This action will permanently delete the obfuscated file. The original file will remain. This cannot be undone."
        }
        confirmationText="delete"
        confirmButtonText={isOriginalFile ? "Delete Document" : "Delete Obfuscated File"}
        variant="destructive"
      />
    </div>
  )
}
