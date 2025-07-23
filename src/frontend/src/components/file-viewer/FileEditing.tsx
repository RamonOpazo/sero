import { useState } from 'react'
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
import { X, Plus, List, MessageSquare } from 'lucide-react'
import { AddPromptDialog } from './AddPromptDialog'

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
  pageNumber?: number
  createdAt: string
}

type FileEditingProps = {
  selections: Selection[]
  isOriginalFile: boolean
  onClearSelections: () => void
  onSelectionDelete?: (id: string) => void
  onPageChange?: (page: number) => void
}

export function FileEditing({ 
  selections, 
  isOriginalFile, 
  onClearSelections, 
  onSelectionDelete,
}: FileEditingProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([
    {
      id: '1',
      text: 'Extract all monetary amounts mentioned in this document',
      pageNumber: 1,
      createdAt: '2024-01-15T10:30:00Z'
    },
    {
      id: '2', 
      text: 'Identify any person names or organization names',
      createdAt: '2024-01-15T11:15:00Z'
    },
    {
      id: '3',
      text: 'List all dates mentioned in chronological order',
      pageNumber: 3,
      createdAt: '2024-01-15T14:45:00Z'
    }
  ])
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false)
  const [isSelectionsSheetOpen, setIsSelectionsSheetOpen] = useState(false)
  const [isPromptsSheetOpen, setIsPromptsSheetOpen] = useState(false)

  const handleAddPrompt = (text: string) => {
    const newPrompt: Prompt = {
      id: Date.now().toString(),
      text,
      createdAt: new Date().toISOString()
    }
    setPrompts(prev => [...prev, newPrompt])
  }

  const handlePromptDelete = (id: string) => {
    setPrompts(prev => prev.filter(prompt => prompt.id !== id))
  }

  return (
    <div className="flex-1 flex flex-col p-6">
      <h3 className="text-sm font-medium mb-4">PDF Editing</h3>

      <div className="space-y-4">
        {/* Selections Sheet */}
        <Sheet open={isSelectionsSheetOpen} onOpenChange={setIsSelectionsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <List className="h-4 w-4 mr-2" />
              Open Selections ({selections.length})
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-96 sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Selections ({selections.length})</SheetTitle>
              <SheetDescription>
                Manage your PDF selections
              </SheetDescription>
            </SheetHeader>
            
            <div className="grid flex-1 auto-rows-min gap-4 py-4">
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-3 pr-4 ml-4">
                  {selections.length > 0 ? (
                    selections.map((selection, index) => (
                      <div key={selection.id} className="p-3 bg-muted/50 rounded border">
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
                              onClick={() => onSelectionDelete(selection.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        {selection.text && (
                          <p className="text-muted-foreground text-xs mb-2">{selection.text}</p>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Position: ({Math.round(selection.x)}, {Math.round(selection.y)})
                          Size: {Math.round(selection.width)} × {Math.round(selection.height)}
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
                          {prompt.pageNumber && (
                            <Badge variant="outline" className="text-xs">
                              Page {prompt.pageNumber}
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
                    onClick={() => {
                      setPrompts([])
                      setIsPromptsSheetOpen(false)
                    }}
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
      </div>
      
      <AddPromptDialog 
        open={isPromptDialogOpen}
        onOpenChange={setIsPromptDialogOpen}
        onAddPrompt={handleAddPrompt}
      />
    </div>
  )
}
