import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, Trash2, Plus, Undo2, RotateCcw, AlertCircle } from "lucide-react";
import { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "sonner";
import type { MinimalDocumentType } from "@/types";
import { AddPromptDialog, SavePromptChangesConfirmationDialog } from "../dialogs";
import PromptsList from "./prompt-list";
import { usePrompts } from "../../providers/prompt-provider";

interface PromptControlsProps {
  document: MinimalDocumentType;
}

/**
 * Prompt controls component
 * Manages prompt visibility, saving, and clearing operations
 */
export default function PromptManagement({ document }: PromptControlsProps) {
  const {
    state,
    load,
    save,
    createPrompt,
    updatePrompt,
    clearAll,
    discardAllChanges,
    allPrompts,
    hasUnsavedChanges,
    pendingChangesCount,
  } = usePrompts();
  
  const isSaving = (state as any).isSaving || false;
  const isLoading = (state as any).isLoading || false;
  const isDeleting = (state as any).isDeleting || false;
  const error = (state as any).error || null;
  const isAnyOperationInProgress = !!(isSaving || isLoading || isDeleting);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);
  
  // Load prompts when component mounts
  useEffect(() => {
    load();
  }, [load]);

  // Calculate prompt statistics
  const promptStats = useMemo(() => {
    const totalCount = allPrompts.length;
    const savedCount = (state as any).persistedItems?.length || 0;
    const newCount = (state as any).draftItems?.length || 0;
    return {
      totalCount,
      savedCount,
      newCount,
      hasUnsavedChanges,
      totalUnsavedChanges: pendingChangesCount,
    };
  }, [allPrompts.length, (state as any).persistedItems?.length, (state as any).draftItems?.length, hasUnsavedChanges, pendingChangesCount]);

  // Add new rule locally (not saved to server until saveAllChanges is called)
  const handleAddRule = useCallback((ruleData: {
    type: string;
    title: string;
    rule: string;
    priority: 'high' | 'medium' | 'low';
    enabled: boolean;
  }) => {
    try {
      const promptText = `Rule Type: ${ruleData.type}\n` +
                        `Priority: ${ruleData.priority.toUpperCase()}\n` +
                        `Title: ${ruleData.title}\n\n` +
                        `Instructions:\n${ruleData.rule}`;
      const promptData = {
        title: ruleData.title,
        prompt: promptText,
        directive: 'process',
        enabled: true,
      } as any;
      
      createPrompt(promptData);
      toast.success(`${ruleData.title} rule added (not yet saved)`);
      setShowAddDialog(false);
      
    } catch (error) {
      console.error('Error adding rule:', error);
      toast.error('Failed to add AI rule');
    }
  }, [createPrompt]);

  // Save all pending changes with confirmation
  const handleSaveAllPrompts = useCallback(() => {
    if (promptStats.totalUnsavedChanges === 0) {
      toast.info('No pending changes to save');
      return;
    }
    setShowSaveConfirmDialog(true);
  }, [promptStats.totalUnsavedChanges]);
  
  // Handler to close save confirmation dialog
  const handleCloseSaveConfirmDialog = useCallback(() => {
    setShowSaveConfirmDialog(false);
  }, []);
  
  // Handler for confirmed save action
  const handleConfirmedSave = useCallback(async () => {
    try {
      const result = await save();
      if (result.ok) {
        const savedCount = promptStats.totalUnsavedChanges;
        toast.success(`Successfully saved ${savedCount} change${savedCount === 1 ? '' : 's'}`);
        setShowSaveConfirmDialog(false);
      } else {
        toast.error('Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    }
  }, [save, promptStats.totalUnsavedChanges]);
  
  // Discard all unsaved changes
  const handleDiscardAllChanges = useCallback(() => {
    if (promptStats.totalUnsavedChanges === 0) {
      toast.info('No unsaved changes to discard');
      return;
    }
    
    discardAllChanges();
    toast.success(`Discarded ${promptStats.totalUnsavedChanges} unsaved change${promptStats.totalUnsavedChanges === 1 ? '' : 's'}`);
  }, [discardAllChanges, promptStats.totalUnsavedChanges]);
  
  // Clear all prompts
  const handleClearAll = useCallback(() => {
    if (promptStats.totalCount === 0) {
      toast.info('No prompts to clear');
      return;
    }
    
    clearAll();
    toast.success(`Cleared all ${promptStats.totalCount} prompts`);
  }, [clearAll, promptStats.totalCount]);

  // Handle add prompt button
  const handleOpenAddDialog = useCallback(() => {
    setShowAddDialog(true);
  }, []);

  const handleCloseAddDialog = useCallback(() => {
    setShowAddDialog(false);
  }, []);

  // Handle edit prompt
  const handleEditPrompt = useCallback((promptId: string) => {
    setEditingPromptId(promptId);
    setShowEditDialog(true);
  }, []);

  const handleCloseEditDialog = useCallback(() => {
    setShowEditDialog(false);
    setEditingPromptId(null);
  }, []);

  // Handle edit rule submission
  const handleEditRule = useCallback((ruleData: {
    type: string;
    title: string;
    rule: string;
    priority: 'high' | 'medium' | 'low';
    enabled: boolean;
  }) => {
    if (!editingPromptId) return;
    
    try {
      // Transform rule data to prompt format
      const promptText = `Rule Type: ${ruleData.type}\n` +
                        `Priority: ${ruleData.priority.toUpperCase()}\n` +
                        `Title: ${ruleData.title}\n\n` +
                        `Instructions:\n${ruleData.rule}`;
      
      // Map priority to temperature (AI creativity level)
      const temperatureMap = {
        'high': 0.1,    // Low creativity for critical compliance rules
        'medium': 0.3,  // Moderate creativity for important rules
        'low': 0.5      // Higher creativity for optional rules
      };
      
      updatePrompt(editingPromptId, {
        title: ruleData.title,
        prompt: promptText,
        directive: 'process',
        enabled: true,
      } as any);
      
      toast.success(`${ruleData.title} rule updated (not yet saved)`);
      setShowEditDialog(false);
      setEditingPromptId(null);
      
    } catch (error) {
      console.error('Error updating rule:', error);
      toast.error('Failed to update AI rule');
    }
  }, [editingPromptId, updatePrompt]);

  if (error) {
    return (
      <div className="text-xs text-destructive p-3 border border-destructive/20 bg-destructive/5 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Prompt Statistics */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total Prompts</span>
          <span className="text-xs font-mono">{promptStats.totalCount}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Saved Prompts</span>
          <span className="text-xs font-mono">{promptStats.savedCount}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">New Prompts</span>
          <span className="text-xs font-mono">{promptStats.newCount}</span>
        </div>
        
        {promptStats.hasUnsavedChanges && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Unsaved Changes</span>
              <AlertCircle className="h-3 w-3 text-amber-500" />
            </div>
            <span className="text-xs font-mono">{promptStats.totalUnsavedChanges}</span>
          </div>
        )}
      </div>
      
      <Separator />
      
      {/* Action Controls */}
      <div className="flex flex-col gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleOpenAddDialog}
          disabled={isAnyOperationInProgress}
          className="w-full justify-start h-9 text-xs"
        >
          <Plus className="mr-2 h-3 w-3" />
          Add Rule
        </Button>
        
        <Button
          variant="default"
          size="sm"
          onClick={handleSaveAllPrompts}
          disabled={isAnyOperationInProgress || promptStats.totalUnsavedChanges === 0}
          className="w-full justify-start h-9 text-xs"
        >
          {isSaving ? (
            <RotateCcw className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <Save className="mr-2 h-3 w-3" />
          )}
          Save all changes
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleDiscardAllChanges}
          disabled={promptStats.totalUnsavedChanges === 0}
          className="w-full justify-start h-9 text-xs"
        >
          <Undo2 className="mr-2 h-3 w-3" />
          Discard all changes
        </Button>
        
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClearAll}
          disabled={promptStats.totalCount === 0}
          className="w-full justify-start h-9 text-xs"
        >
          <Trash2 className="mr-2 h-3 w-3" />
          Clear all
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col gap-2 w-full min-w-0">
        <PromptsList documentId={document.id} onEditPrompt={handleEditPrompt} />
      </div>
      
      {/* Add Rule Dialog */}
      <AddPromptDialog
        isOpen={showAddDialog}
        onClose={handleCloseAddDialog}
        onConfirm={handleAddRule}
        isSubmitting={false}
      />
      
      {/* Edit Rule Dialog */}
      {editingPromptId && (() => {
        const editingPrompt = allPrompts.find(p => p.id === editingPromptId);
        if (!editingPrompt) return null;
        
        // Parse the prompt text to extract form data
        const parsePromptText = (text: string) => {
          const lines = text.split('\n');
          let ruleType: string = 'custom';
          let priority: string = 'medium';
          let title: string = 'AI Rule';
          let instructions: string = text;
          
          lines.forEach((line, index) => {
            if (line.startsWith('Rule Type: ')) {
              ruleType = line.replace('Rule Type: ', '').trim();
            } else if (line.startsWith('Priority: ')) {
              priority = line.replace('Priority: ', '').toLowerCase().trim();
            } else if (line.startsWith('Title: ')) {
              title = line.replace('Title: ', '').trim();
            } else if (line.startsWith('Instructions:')) {
              instructions = lines.slice(index + 1).join('\n').trim();
            }
          });
          
          // Map rule type strings to enum values
          const getRuleType = (typeStr: string) => {
            const normalizedType = typeStr.toLowerCase();
            if (normalizedType.includes('identify-and-mark') || normalizedType.includes('identify and mark')) return 'identify-and-mark';
            if (normalizedType.includes('redact-content') || normalizedType.includes('redact content')) return 'redact-content';
            if (normalizedType.includes('preserve-content') || normalizedType.includes('preserve content')) return 'preserve-content';
            if (normalizedType.includes('exclude-content') || normalizedType.includes('exclude content')) return 'exclude-content';
            return 'custom';
          };
          
          // Map priority strings
          const getPriority = (priorityStr: string) => {
            const normalizedPriority = priorityStr.toLowerCase();
            if (normalizedPriority === 'high') return 'high';
            if (normalizedPriority === 'low') return 'low';
            return 'medium';
          };
          
          return {
            type: getRuleType(ruleType),
            title,
            rule: instructions,
            priority: getPriority(priority)
          };
        };
        
        const parsedData = parsePromptText(editingPrompt.prompt);
        
        return (
          <AddPromptDialog
            isOpen={showEditDialog}
            onClose={handleCloseEditDialog}
            onConfirm={handleEditRule}
            isSubmitting={false}
            mode="edit"
            initialData={{
              id: editingPrompt.id,
              type: parsedData.type as any,
              title: parsedData.title,
              rule: parsedData.rule,
              priority: parsedData.priority as any,
              temperature: editingPrompt.temperature,
              languages: editingPrompt.languages
            }}
          />
        );
      })()}
      
      {/* Save Confirmation Dialog */}
      <SavePromptChangesConfirmationDialog
        isOpen={showSaveConfirmDialog}
        onClose={handleCloseSaveConfirmDialog}
        onConfirm={handleConfirmedSave}
        changesCount={promptStats.totalUnsavedChanges}
        isSaving={isSaving}
      />
    </div>
  );
}
