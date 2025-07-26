import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { X, Plus, List, MessageSquare, Save } from 'lucide-react'
import { AddPromptDialog } from '../../dialogs/AddPromptDialog'
import { ConfirmationDialog } from '../../dialogs/ConfirmationDialog'

type Selection = {
  id: string
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
  text?: string
}

type Prompt = {
  id: string
  text: string
  label?: string
  languages: string[]
  temperature: number
  createdAt: string
  updatedAt?: string
}

type EditingPanelProps = {
  selections: Selection[]
  prompts: Prompt[]
  isOriginalFile: boolean
  fileId?: string
  isLoadingFileData?: boolean
  backendSelectionsCount?: number
  backendPromptsCount?: number
  activeSelectionId?: string | null
  onClearSelections: () => void
  onSelectionDelete?: (id: string) => void
  onSelectionActivate?: (id: string) => void
  onPageChange?: (page: number) => void
}

export function EditingPanel({
  selections, 
  prompts: initialPrompts,
  isOriginalFile, 
  fileId,
  isLoadingFileData,
  backendSelectionsCount,
  backendPromptsCount,
  activeSelectionId,
  onClearSelections, 
  onSelectionDelete,
  onSelectionActivate
}: EditingPanelProps) {
  // Local prompts state initialized from props
  const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts)

  // Update local prompts when props change
  useEffect(() => {
    setPrompts(initialPrompts)
  }, [initialPrompts])
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false)
  const [isSelectionsSheetOpen, setIsSelectionsSheetOpen] = useState(false)
  const [isPromptsSheetOpen, setIsPromptsSheetOpen] = useState(false)
  const [isClearPromptsDialogOpen, setIsClearPromptsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleAddPrompt = (text: string) => {
    const newPrompt: Prompt = {
      id: Date.now().toString(),
      text,
      label: undefined,
      languages: ['english'],
      temperature: 0.7,
      createdAt: new Date().toISOString()
    }
    setPrompts(prev => [...prev, newPrompt])
  }

  const handlePromptDelete = (id: string) => {
    setPrompts(prev => prev.filter(prompt => prompt.id !== id))
  }

  const handleClearAllPrompts = async () => {
    // TODO: Implement actual API call to clear prompts
    setPrompts([])
  }

  const handleSaveChanges = async () => {
    if (!isOriginalFile || !fileId) return
    
    setIsSaving(true)
    try {
      // Save selections if any
      if (selections.length > 0) {
        // Selections coordinates are already normalized (0-1 range) from Renderer
        const selectionsPayload = selections.map(selection => ({
          label: selection.text || null,
          page_number: selection.pageNumber,
          x: selection.x, // Normalized coordinate (0-1)
          y: selection.y, // Normalized coordinate (0-1)
          width: selection.width, // Normalized dimension (0-1)
          height: selection.height, // Normalized dimension (0-1)
          confidence: null // Not used in frontend selections
        }))

        const selectionsResponse = await fetch(`/api/files/id/${fileId}/selections`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(selectionsPayload)
        })

        if (!selectionsResponse.ok) {
          throw new Error(`Failed to save selections: ${selectionsResponse.statusText}`)
        }
      }

      // Save prompts if any
      if (prompts.length > 0) {
        const promptsPayload = prompts.map(prompt => ({
          label: null,
          text: prompt.text,
          languages: ['english'], // Default to English
          temperature: 0.7 // Default temperature
        }))

        const promptsResponse = await fetch(`/api/files/id/${fileId}/prompts`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(promptsPayload)
        })

        if (!promptsResponse.ok) {
          throw new Error(`Failed to save prompts: ${promptsResponse.statusText}`)
        }
      }
      
    } catch (error) {
      console.error('Error saving changes:', error)
      // TODO: Show error toast notification
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col p-6">
      <h3 className="text-sm font-medium mb-4">Document Editing</h3>

      <div className="space-y-4">
        {/* Selections Sheet */}
        <Sheet open={isSelectionsSheetOpen} onOpenChange={setIsSelectionsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <List className="h-4 w-4 mr-2" />
              Open Selections ({selections.length})
              {isLoadingFileData && selections.length === 0 && backendSelectionsCount !== undefined && backendSelectionsCount > 0 && (
                <span className="ml-1 text-muted-foreground">({backendSelectionsCount})</span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-96 sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Selections ({selections.length})</SheetTitle>
              <SheetDescription>
                Manage your document selections
              </SheetDescription>
            </SheetHeader>
            
            <div className="grid flex-1 auto-rows-min gap-4 py-4">
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-3 pr-4 ml-4">
                  {selections.length > 0 ? (
                    selections.map((selection, index) => (
                      <div 
                        key={selection.id} 
                        className={`p-3 rounded border cursor-pointer hover:bg-muted/70 transition-colors ${selection.id === activeSelectionId ? 'bg-orange-50 border-orange-300 dark:bg-orange-950 dark:border-orange-700' : 'bg-muted/50'}`}
                        onClick={() => onSelectionActivate ? onSelectionActivate(selection.id) : null}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium text-sm">Selection {index + 1}</span>
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Page {selection.pageNumber}
                            </Badge>
                          </div>
                          {isOriginalFile && onSelectionDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                onSelectionDelete(selection.id)
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        {selection.text && (
                          <p className="text-muted-foreground text-xs mb-2">{selection.text}</p>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Position: ({Math.round(selection.x * 100)}%, {Math.round(selection.y * 100)}%)
                          Size: {Math.round(selection.width * 100)}% × {Math.round(selection.height * 100)}%
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No selections made yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Click and drag on the PDF to create selections</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
            
            {isOriginalFile && selections.length > 0 && (
              <SheetFooter>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    onClearSelections()
                    setIsSelectionsSheetOpen(false)
                  }}
                >
                  Clear All Selections
                </Button>
                <SheetClose asChild>
                  <Button variant="outline">Close</Button>
                </SheetClose>
              </SheetFooter>
            )}
          </SheetContent>
        </Sheet>

        {/* Prompts Sheet */}
        <Sheet open={isPromptsSheetOpen} onOpenChange={setIsPromptsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <MessageSquare className="h-4 w-4 mr-2" />
              Open Prompts ({prompts.length})
              {isLoadingFileData && prompts.length === 0 && backendPromptsCount !== undefined && backendPromptsCount > 0 && (
                <span className="ml-1 text-muted-foreground">({backendPromptsCount})</span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-96 sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Prompts ({prompts.length})</SheetTitle>
              <SheetDescription>
                Manage your AI prompts
              </SheetDescription>
            </SheetHeader>
            
            <div className="grid flex-1 auto-rows-min gap-4 py-4">
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-3 pr-4 ml-4">
                  {prompts.length > 0 ? (
                    prompts.map((prompt) => (
                      <div key={prompt.id} className="p-3 bg-muted/30 rounded border relative group">
                        {isOriginalFile && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 w-6 p-0 text-destructive opacity-0 group-hover:opacity-100"
                            onClick={() => handlePromptDelete(prompt.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                        <p className="text-sm mb-2 pr-8">{prompt.text}</p>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{new Date(prompt.createdAt).toLocaleDateString()}</span>
                          {prompt.label && (
                            <Badge variant="outline" className="text-xs">
                              {prompt.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">
                        {isOriginalFile ? 'No prompts added yet' : 'Prompts not available for obfuscated files'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
            
            {isOriginalFile && (
              <SheetFooter>
                <Button 
                  size="sm" 
                  onClick={() => setIsPromptDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Prompt
                </Button>
                
                {prompts.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setIsClearPromptsDialogOpen(true)}
                  >
                    Clear All Prompts
                  </Button>
                )}
                
                <SheetClose asChild>
                  <Button variant="outline">Close</Button>
                </SheetClose>
              </SheetFooter>
            )}
          </SheetContent>
        </Sheet>

        {/* Save Changes Button */}
        {isOriginalFile && (selections.length > 0 || prompts.length > 0) && (
          <Button 
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        )}
      </div>
      
      <AddPromptDialog 
        open={isPromptDialogOpen}
        onOpenChange={setIsPromptDialogOpen}
        onAddPrompt={handleAddPrompt}
      />
      
      <ConfirmationDialog
        isOpen={isClearPromptsDialogOpen}
        onClose={() => setIsClearPromptsDialogOpen(false)}
        onConfirm={async () => {
          await handleClearAllPrompts()
          setIsPromptsSheetOpen(false)
        }}
        title="Clear All Prompts"
        description="This action will permanently delete all prompts for this document. This cannot be undone."
        confirmationText="clear prompts"
        confirmButtonText="Clear All Prompts"
        variant="destructive"
      />
    </div>
  )
}
