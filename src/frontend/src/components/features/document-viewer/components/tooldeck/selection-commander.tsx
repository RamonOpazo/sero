import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, RotateCcw, AlertCircle, Trash2, FileX, Undo2, Brain, CheckCheck, Eraser, Undo } from "lucide-react";
import { useViewportState } from "../../providers/viewport-provider";
import { useSelections } from "../../providers/selection-provider";
import { toast } from "sonner";
import { useState, useCallback, useMemo } from "react";
import type { MinimalDocumentType } from "@/types";
import { SaveConfirmationDialog } from "../dialogs";
import SelectionsList from "./selection-list";

interface SelectionControlsProps {
  document: MinimalDocumentType;
}

/**
 * Selection controls component
 * Manages selection visibility, saving, and clearing operations
 */
export default function SelectionManagement({ document }: SelectionControlsProps) {
  // Access to avoid TS6133 unused parameter error during builds
  void document;
  const { isViewingProcessedDocument, currentPage } = useViewportState();

  const {
    state: selectionState,
    allSelections,
    pendingChanges,
    pendingChangesCount,
    clearAll,
    clearPage,
    discardAllChanges,
    save,
  } = useSelections();

  const [isApplyingAI, setIsApplyingAI] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Calculate selection statistics using the clean PendingChanges API
  const selectionStats = useMemo(() => {
    const newCount = pendingChanges.creates.length;
    const existingCount = (selectionState as any).persistedItems?.length || 0;
    const totalCount = allSelections.length;
    const modifiedSavedCount = pendingChanges.updates.length;
    const pendingDeletionsCount = pendingChanges.deletes.length;
    const totalUnsavedChanges = pendingChangesCount;
    const hasUnsavedChanges = totalUnsavedChanges > 0;

    return {
      newCount,
      existingCount,
      totalCount,
      modifiedSavedCount,
      pendingDeletionsCount,
      totalUnsavedChanges,
      hasUnsavedChanges
    };
  }, [pendingChanges, pendingChangesCount, (selectionState as any).persistedItems?.length, allSelections.length]);

  // Apply AI to generate staged selections
  const handleApplyAI = useCallback(async () => {
    try {
      setIsApplyingAI(true);
      const result = await import('@/lib/document-viewer-api').then(m => m.DocumentViewerAPI.applyAi((selectionState as any).contextId));
      if (result.ok) {
        toast.success(`AI generated ${result.value.length} selection${result.value.length === 1 ? '' : 's'} (staged)`);
        // Reload selections from backend to reflect staged items
        if (typeof (selectionState as any).reload === 'function') {
          await (selectionState as any).reload();
        }
      } else {
        toast.error('Failed to apply AI');
      }
    } catch (err) {
      toast.error('Failed to apply AI');
    } finally {
      setIsApplyingAI(false);
    }
  }, [selectionState]);

  // Commit all staged selections
  const handleCommitAll = useCallback(async () => {
    try {
      const api = (await import('@/lib/document-viewer-api')).DocumentViewerAPI;
      const docId = (selectionState as any).contextId as string;
      const result = await api.commitStagedSelections(docId, { commit_all: true });
      if (result.ok) {
        toast.success(`Committed ${result.value.length} selection${result.value.length === 1 ? '' : 's'}`);
        if (typeof (selectionState as any).reload === 'function') {
          await (selectionState as any).reload();
        }
      } else {
        toast.error('Failed to commit selections');
      }
    } catch {
      toast.error('Failed to commit selections');
    }
  }, [selectionState]);

  // Uncommit all committed selections back to staged
  const handleUncommitAll = useCallback(async () => {
    try {
      const api = (await import('@/lib/document-viewer-api')).DocumentViewerAPI;
      const docId = (selectionState as any).contextId as string;
      const result = await api.uncommitSelections(docId, { uncommit_all: true });
      if (result.ok) {
        toast.success(`Moved ${result.value.length} selection${result.value.length === 1 ? '' : 's'} back to staged`);
        if (typeof (selectionState as any).reload === 'function') {
          await (selectionState as any).reload();
        }
      } else {
        toast.error('Failed to uncommit selections');
      }
    } catch {
      toast.error('Failed to uncommit selections');
    }
  }, [selectionState]);

  // Clear all staged selections
  const handleClearStaged = useCallback(async () => {
    try {
      const api = (await import('@/lib/document-viewer-api')).DocumentViewerAPI;
      const docId = (selectionState as any).contextId as string;
      const result = await api.clearStagedSelections(docId, { clear_all: true });
      if (result.ok) {
        toast.success('Cleared staged selections');
        if (typeof (selectionState as any).reload === 'function') {
          await (selectionState as any).reload();
        }
      } else {
        toast.error('Failed to clear staged selections');
      }
    } catch {
      toast.error('Failed to clear staged selections');
    }
  }, [selectionState]);

  // Save all pending changes using SelectionManager
  const performSaveAllSelections = useCallback(async () => {
    if (pendingChangesCount === 0) {
      toast.info('No pending changes to save');
      return;
    }

    setIsSaving(true);

    try {
      const result = await save();

      if (result.ok) {
        // Calculate statistics for user feedback
        const creates = pendingChanges.creates.length;
        const updates = pendingChanges.updates.length;
        const deletes = pendingChanges.deletes.length;

        const messages = [];
        if (creates > 0) messages.push(`${creates} created`);
        if (updates > 0) messages.push(`${updates} updated`);
        if (deletes > 0) messages.push(`${deletes} deleted`);

        toast.success(`Successfully saved changes: ${messages.join(', ')}`);

        // Note: The V2 domain manager's save() method automatically calls COMMIT_CHANGES
        // which updates the baseline and handles state transitions properly.
        // No need to reload from server as local state is now authoritative.
      } else {
        console.error('Failed to save selections:', result.error);
        toast.error('Failed to save selections');
      }

    } catch (error) {
      console.error('Error saving selections:', error);
      toast.error('Failed to save selections');
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, pendingChangesCount, save]);

  // Handler to show confirmation dialog
  const handleSaveAllSelections = useCallback(() => {
    if (pendingChangesCount === 0) {
      toast.info('No pending changes to save');
      return;
    }
    setShowConfirmDialog(true);
  }, [pendingChangesCount]);

  // Handler to close confirmation dialog
  const handleCloseConfirmDialog = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  // Handler for confirmed save action
  const handleConfirmedSave = useCallback(async () => {
    await performSaveAllSelections();
    setShowConfirmDialog(false); // Close dialog after save completes
  }, [performSaveAllSelections]);

  // Clear all selections
  const handleClearAll = useCallback(() => {
    if (allSelections.length === 0) {
      toast.info('No selections to clear');
      return;
    }

    clearAll();
    toast.success(`Cleared all ${allSelections.length} selections`);
  }, [clearAll, allSelections.length]);

  // Discard all unsaved changes
  const handleDiscardAllChanges = useCallback(() => {
    if (selectionStats.totalUnsavedChanges === 0) {
      toast.info('No unsaved changes to discard');
      return;
    }

    discardAllChanges();
    toast.success(`Discarded ${selectionStats.totalUnsavedChanges} unsaved change${selectionStats.totalUnsavedChanges === 1 ? '' : 's'}`);
  }, [discardAllChanges, selectionStats.totalUnsavedChanges]);

  // Clear current page selections
  const handleClearPage = useCallback(() => {
    const pageSelections = allSelections.filter(sel => sel.page_number === currentPage);
    if (pageSelections.length === 0) {
      toast.info(`No selections on page ${currentPage + 1}`);
      return;
    }

    clearPage(currentPage);
    toast.success(`Cleared ${pageSelections.length} selections from page ${currentPage + 1}`);
  }, [clearPage, currentPage, allSelections]);

  return (
    <div className="flex flex-col gap-4">
      {/* Selection Statistics */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total Selections</span>
          <span className="text-xs font-mono">{selectionStats.totalCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Saved Selections</span>
          <span className="text-xs font-mono">{selectionStats.existingCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">New Selections</span>
          <span className="text-xs font-mono">{selectionStats.newCount}</span>
        </div>

        {selectionStats.hasUnsavedChanges && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Unsaved Changes</span>
              <AlertCircle className="h-3 w-3 text-amber-500" />
            </div>
            <span className="text-xs font-mono">{selectionStats.totalUnsavedChanges}</span>
          </div>
        )}
      </div>

      <Separator />

      {/* AI & Lifecycle Controls */}
      <div className="flex flex-col gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleApplyAI}
          disabled={isApplyingAI || isViewingProcessedDocument}
          className="w-full justify-start h-9 text-xs"
        >
          {isApplyingAI ? (
            <RotateCcw className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <Brain className="mr-2 h-3 w-3" />
          )}
          {isApplyingAI ? 'Applying AI...' : 'Apply AI (stage)'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCommitAll}
          disabled={isViewingProcessedDocument}
          className="w-full justify-start h-9 text-xs"
        >
          <CheckCheck className="mr-2 h-3 w-3" />
          Commit all staged
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleUncommitAll}
          disabled={isViewingProcessedDocument}
          className="w-full justify-start h-9 text-xs"
        >
          <Undo className="mr-2 h-3 w-3" />
          Uncommit all
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleClearStaged}
          disabled={isViewingProcessedDocument}
          className="w-full justify-start h-9 text-xs"
        >
          <Eraser className="mr-2 h-3 w-3" />
          Clear staged selections
        </Button>
      </div>

      <Separator />

      {/* Action Controls */}
      <div className="flex flex-col gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleSaveAllSelections}
          disabled={isSaving || selectionStats.totalUnsavedChanges === 0 || isViewingProcessedDocument}
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
          disabled={isViewingProcessedDocument || selectionStats.totalUnsavedChanges === 0}
          className="w-full justify-start h-9 text-xs"
        >
          <Undo2 className="mr-2 h-3 w-3" />
          Discard all changes
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleClearPage}
          disabled={isViewingProcessedDocument || allSelections.filter(s => s.page_number === currentPage).length === 0}
          className="w-full justify-start h-9 text-xs"
        >
          <FileX className="mr-2 h-3 w-3" />
          Clear page
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={handleClearAll}
          disabled={isViewingProcessedDocument || allSelections.length === 0}
          className="w-full justify-start h-9 text-xs"
        >
          <Trash2 className="mr-2 h-3 w-3" />
          Clear all
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <SelectionsList />
      </div>

      {/* Save Confirmation Dialog */}
      <SaveConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={handleCloseConfirmDialog}
        onConfirm={handleConfirmedSave}
        changesCount={selectionStats.totalUnsavedChanges}
        isSaving={isSaving}
      />
    </div>
  );
}
