import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, Trash2, Plus, Undo2, RotateCcw, AlertCircle } from "lucide-react";
import { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "sonner";
import type { MinimalDocumentType } from "@/types";
import { SavePromptChangesConfirmationDialog } from "../dialogs";
import { FormConfirmationDialog } from "@/components/shared";
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
  // Form-managed state for prompt creation
  const [formTitle, setFormTitle] = useState('');
  const [formDirective, setFormDirective] = useState('process');
  const [formPrompt, setFormPrompt] = useState('');

  const handleCreatePromptConfirmed = useCallback(async () => {
    const title = formTitle.trim();
    const directive = formDirective.trim();
    const promptBody = formPrompt.trim();
    if (!title || !promptBody || !directive) {
      toast.error('Please fill in title, directive, and prompt');
      return;
    }

    const promptData = {
      title,
      directive,
      prompt: promptBody,
      state: 'committed',
      scope: 'document',
    } as any;

    createPrompt(promptData);
    const res = await save();
    if (!res.ok) {
      toast.error('Failed to create prompt');
      return;
    }

    toast.success(`${title} rule created and committed`);
    setShowAddDialog(false);
    setFormTitle('');
    setFormDirective('process');
    setFormPrompt('');
  }, [formTitle, formDirective, formPrompt, createPrompt, save]);

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

  // Pre-fill edit form when opening the edit dialog
  useEffect(() => {
    if (showEditDialog && editingPromptId) {
      const editing = allPrompts.find(p => p.id === editingPromptId) as any;
      if (editing) {
        setFormTitle(editing.title ?? '');
        setFormDirective(editing.directive ?? 'process');
        setFormPrompt(editing.prompt ?? '');
      }
    }
  }, [showEditDialog, editingPromptId, allPrompts]);

  // Confirm handler for editing an existing prompt
  const handleEditPromptConfirmed = useCallback(async () => {
    if (!editingPromptId) return;
    const title = formTitle.trim();
    const directive = formDirective.trim();
    const promptBody = formPrompt.trim();
    if (!title || !promptBody || !directive) {
      toast.error('Please fill in title, directive, and prompt');
      return;
    }

    try {
      updatePrompt(editingPromptId, {
        title,
        prompt: promptBody,
        directive,
        state: 'committed',
        scope: 'document',
      } as any);
      const res = await save();
      if (!res.ok) {
        toast.error('Failed to update prompt');
        return;
      }
      toast.success('Rule updated and committed');
      setShowEditDialog(false);
      setEditingPromptId(null);
    } catch (error) {
      console.error('Error updating rule:', error);
      toast.error('Failed to update AI rule');
    }
  }, [editingPromptId, formTitle, formDirective, formPrompt, updatePrompt, save]);

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
      
      {/* Add Prompt Dialog using reusable FormConfirmationDialog */}
      <FormConfirmationDialog
        isOpen={showAddDialog}
        onClose={handleCloseAddDialog}
        onConfirm={handleCreatePromptConfirmed}
        title="Create AI Rule"
        description="Fill in the prompt details. The rule will be created and immediately committed."
        confirmButtonText="Create rule"
        cancelButtonText="Cancel"
        variant="default"
        messages={[]}
        formFields={[
          (
            <div key="title" className="space-y-1">
              <label className="text-xs font-medium">Title</label>
              <input
                className="w-full h-9 px-3 rounded border border-input bg-background text-sm"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Short descriptive title"
              />
            </div>
          ),
          (
            <div key="directive" className="space-y-1">
              <label className="text-xs font-medium">Directive</label>
              <input
                className="w-full h-9 px-3 rounded border border-input bg-background text-sm"
                value={formDirective}
                onChange={(e) => setFormDirective(e.target.value)}
                placeholder="process"
              />
            </div>
          ),
          (
            <div key="prompt" className="space-y-1">
              <label className="text-xs font-medium">Prompt</label>
              <textarea
                className="w-full min-h-32 px-3 py-2 rounded border border-input bg-background text-sm"
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                placeholder="Detailed instructions for the AI"
              />
            </div>
          ),
        ]}
      />
      
      {/* Edit Rule Dialog using FormConfirmationDialog */}
      {editingPromptId ? (
        <FormConfirmationDialog
          isOpen={showEditDialog}
          onClose={handleCloseEditDialog}
          onConfirm={handleEditPromptConfirmed}
          title="Edit AI Rule"
          description="Modify the rule. Changes will be saved and committed."
          confirmButtonText="Save changes"
          cancelButtonText="Cancel"
          variant="default"
          messages={[]}
          formFields={[
            (
              <div key="title" className="space-y-1">
                <label className="text-xs font-medium">Title</label>
                <input
                  className="w-full h-9 px-3 rounded border border-input bg-background text-sm"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Short descriptive title"
                />
              </div>
            ),
            (
              <div key="directive" className="space-y-1">
                <label className="text-xs font-medium">Directive</label>
                <input
                  className="w-full h-9 px-3 rounded border border-input bg-background text-sm"
                  value={formDirective}
                  onChange={(e) => setFormDirective(e.target.value)}
                  placeholder="process"
                />
              </div>
            ),
            (
              <div key="prompt" className="space-y-1">
                <label className="text-xs font-medium">Prompt</label>
                <textarea
                  className="w-full min-h-32 px-3 py-2 rounded border border-input bg-background text-sm"
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="Detailed instructions for the AI"
                />
              </div>
            ),
          ]}
        />
      ) : null}
      
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
