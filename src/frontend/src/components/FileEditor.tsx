"use client"

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Square, 
  Type, 
  Trash2, 
  Plus,
  X
} from 'lucide-react'
import type { Document as DocumentType } from '@/types'

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
  selectionId: string
  text: string
  response?: string
}

interface FileEditorProps {
  document: DocumentType
  selections: Selection[]
  prompts: Prompt[]
  onSelectionCreate: (selection: Omit<Selection, 'id'>) => void
  onSelectionUpdate: (selectionId: string, updates: Partial<Selection>) => void
  onSelectionDelete: (selectionId: string) => void
  onPromptCreate: (prompt: Omit<Prompt, 'id'>) => void
  onPromptUpdate: (promptId: string, updates: Partial<Prompt>) => void
  onPromptDelete: (promptId: string) => void
  isSelecting: boolean
  onSelectionModeChange: (isSelecting: boolean) => void
  selectionMode: 'text' | 'area'
  onSelectionModeTypeChange: (mode: 'text' | 'area') => void
}

export function FileEditor({
  selections,
  prompts,
  onSelectionDelete,
  onPromptCreate,
  onPromptDelete,
  isSelecting,
  onSelectionModeChange,
  selectionMode,
  onSelectionModeTypeChange
}: FileEditorProps) {
  const [selectedSelection, setSelectedSelection] = useState<string | null>(null)
  const [newPromptText, setNewPromptText] = useState('')

  const handleSelectionClick = useCallback((selectionId: string) => {
    setSelectedSelection(selectedSelection === selectionId ? null : selectionId)
  }, [selectedSelection])

  const handleCreatePrompt = useCallback((selectionId: string) => {
    if (newPromptText.trim()) {
      onPromptCreate({
        selectionId,
        text: newPromptText.trim()
      })
      setNewPromptText('')
    }
  }, [newPromptText, onPromptCreate])

  const getPromptsForSelection = useCallback((selectionId: string) => {
    return prompts.filter(prompt => prompt.selectionId === selectionId)
  }, [prompts])

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10">
      <div className="h-full flex">
        {/* Left Panel - Selection Tools */}
        <div className="w-80 bg-background border-r flex flex-col">
          {/* Tools Header */}
          <div className="flex-shrink-0 p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Selection Tools</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectionModeChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Selection Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={isSelecting && selectionMode === 'area' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  onSelectionModeTypeChange('area')
                  onSelectionModeChange(true)
                }}
              >
                <Square className="h-4 w-4 mr-2" />
                Area
              </Button>
              <Button
                variant={isSelecting && selectionMode === 'text' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  onSelectionModeTypeChange('text')
                  onSelectionModeChange(true)
                }}
              >
                <Type className="h-4 w-4 mr-2" />
                Text
              </Button>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{selections.length} selections</span>
              <span>{prompts.length} prompts</span>
            </div>
          </div>

          {/* Selections List */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {selections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Square className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No selections yet</p>
                  <p className="text-xs mt-1">Click and drag on the PDF to create selections</p>
                </div>
              ) : (
                selections.map((selection) => {
                  const selectionPrompts = getPromptsForSelection(selection.id)
                  const isSelected = selectedSelection === selection.id

                  return (
                    <div
                      key={selection.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleSelectionClick(selection.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            Page {selection.pageNumber}
                          </Badge>
                          {selection.text && (
                            <Badge variant="outline" className="text-xs">
                              Text
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectionDelete(selection.id)
                          }}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {selection.text && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          "{selection.text}"
                        </p>
                      )}

                      {/* Prompts for this selection */}
                      {selectionPrompts.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {selectionPrompts.map((prompt) => (
                            <div
                              key={prompt.id}
                              className="bg-muted/50 rounded px-2 py-1 text-xs"
                            >
                              <div className="flex items-start justify-between">
                                <p className="flex-1 line-clamp-2">{prompt.text}</p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onPromptDelete(prompt.id)
                                  }}
                                  className="h-4 w-4 p-0 ml-1 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-2 w-2" />
                                </Button>
                              </div>
                              {prompt.response && (
                                <p className="mt-1 text-primary">Response: {prompt.response}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add prompt input */}
                      {isSelected && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Add a prompt..."
                              value={newPromptText}
                              onChange={(e) => setNewPromptText(e.target.value)}
                              className="flex-1 text-xs px-2 py-1 border rounded"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCreatePrompt(selection.id)
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleCreatePrompt(selection.id)}
                              disabled={!newPromptText.trim()}
                              className="h-6 px-2"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Main Content (Transparent overlay for PDF interaction) */}
        <div className="flex-1 relative">
          {isSelecting && (
            <div className="absolute inset-0 z-20">
              {/* Selection overlay instructions */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
                <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
                  <p className="text-sm font-medium">
                    {selectionMode === 'area' 
                      ? 'Click and drag to select an area' 
                      : 'Click and drag to select text'
                    }
                  </p>
                </div>
              </div>
              
              {/* Interactive selection layer */}
              <div 
                className="absolute inset-0 cursor-crosshair"
                onMouseDown={(e) => {
                  // Handle selection start
                  console.log('Selection started at:', e.clientX, e.clientY)
                }}
              />
            </div>
          )}

          {/* Selection overlays */}
          {selections.map((selection) => (
            <div
              key={selection.id}
              className={`absolute border-2 rounded ${
                selectedSelection === selection.id 
                  ? 'border-primary bg-primary/10' 
                  : 'border-blue-500 bg-blue-500/10'
              } cursor-pointer`}
              style={{
                left: `${selection.x}px`,
                top: `${selection.y}px`,
                width: `${selection.width}px`,
                height: `${selection.height}px`,
              }}
              onClick={() => handleSelectionClick(selection.id)}
            >
              <div className="absolute -top-6 left-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                {getPromptsForSelection(selection.id).length > 0 
                  ? `${getPromptsForSelection(selection.id).length} prompts`
                  : 'No prompts'
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
