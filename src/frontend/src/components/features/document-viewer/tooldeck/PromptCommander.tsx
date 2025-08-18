import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, Trash2, Plus, Undo2, RotateCcw, AlertCircle } from "lucide-react";
import { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "sonner";
import type { MinimalDocumentType } from "@/types";
import AddPromptDialog from "../dialogs/AddPromptDialog";
import SavePromptChangesConfirmationDialog from "../dialogs/SavePromptChangesConfirmationDialog";
import PromptsList from "./PromptsList";
import { usePrompts } from "../core/PromptProvider";

interface PromptControlsProps {
  document: MinimalDocumentType;
}

/**
 * Prompt controls component
 * Manages prompt visibility, saving, and clearing operations
 */
export default function PromptManagement({ document }: PromptControlsProps) {
  const {
    state: { savedPrompts, newPrompts, isSaving, error },
    loadPrompts,
    saveAllChanges,
    addPromptLocally,
    clearAll,
    discardAllChanges,
    getAllPrompts,
    hasUnsavedChanges,
    pendingChangesCount,
    isAnyOperationInProgress
  } = usePrompts();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);
  
  // Load prompts when component mounts
  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  // Calculate prompt statistics
  const promptStats = useMemo(() => {
    const allPrompts = getAllPrompts();
    const totalCount = allPrompts.length;
    const savedCount = savedPrompts.length;
    const newCount = newPrompts.length;
    return {
      totalCount,
      savedCount,
      newCount,
      hasUnsavedChanges,
      totalUnsavedChanges: pendingChangesCount,
    };
  }, [getAllPrompts, savedPrompts.length, newPrompts.length, hasUnsavedChanges, pendingChangesCount]);

  // Add new rule locally (not saved to server until saveAllChanges is called)
  const handleAddRule = useCallback((ruleData: {
    type: string;
    title: string;
    rule: string;
    priority: 'high' | 'medium' | 'low';
    enabled: boolean;
  }) => {
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
      
      const promptData = {
        text: promptText,
        languages: ['english', 'castillian'],
        temperature: temperatureMap[ruleData.priority],
      };
      
      addPromptLocally(promptData);
      toast.success(`${ruleData.title} rule added (not yet saved)`);
      setShowAddDialog(false);
      
    } catch (error) {
      console.error('Error adding rule:', error);
      toast.error('Failed to add AI rule');
    }
  }, [addPromptLocally]);

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
      const result = await saveAllChanges();
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
  }, [saveAllChanges, promptStats.totalUnsavedChanges]);
  
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
        <PromptsList documentId={document.id} />
      </div>
      
      {/* Add Rule Dialog */}
      <AddPromptDialog
        isOpen={showAddDialog}
        onClose={handleCloseAddDialog}
        onConfirm={handleAddRule}
        isSubmitting={false}
      />
      
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
