import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, RotateCcw, AlertCircle, Trash2, FileX, Undo2 } from "lucide-react";
import { useViewportState } from "../core/ViewportState";
import { useSelections } from "../core/SelectionProvider";
import { toast } from "sonner";
import { useState, useCallback, useMemo } from "react";
import type { MinimalDocumentType } from "@/types";
import { useDocumentSelections } from "../hooks/use-document-data";
import { SaveConfirmationDialog } from "../dialogs";
import SelectionsList from "./SelectionsList";

interface SelectionControlsProps {
  document: MinimalDocumentType;
}

/**
 * Selection controls component
 * Manages selection visibility, saving, and clearing operations
 */
export default function SelectionManagement({ document }: SelectionControlsProps) {
  const { isViewingProcessedDocument, currentPage } = useViewportState();
  
  const {
    state: selectionState,
    allSelections,
    pendingChanges,
    pendingChangesCount,
    loadSavedSelections,
    clearAll,
    clearPage,
    discardAllChanges,
    saveAllChanges,
  } = useSelections();
  
  // Get fresh selections data for reload after save
  const { refetch: refetchSelections } = useDocumentSelections(document.id);
  
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Calculate selection statistics using the clean PendingChanges API
  const selectionStats = useMemo(() => {
    const newCount = pendingChanges.creates.length;
    const existingCount = selectionState.savedSelections.length;
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
  }, [pendingChanges, pendingChangesCount, selectionState.savedSelections.length, allSelections.length]);

  // Save all pending changes using SelectionManager
  const performSaveAllSelections = useCallback(async () => {
    if (pendingChangesCount === 0) {
      toast.info('No pending changes to save');
      return;
    }

    setIsSaving(true);
    
    try {
      const result = await saveAllChanges();
      
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
        
        // Reload selections from backend to get updated IDs and state
        try {
          const freshSelections = await refetchSelections();
          if (freshSelections) {
            loadSavedSelections(freshSelections);
          }
        } catch (reloadError) {
          console.warn('Failed to reload selections after save:', reloadError);
          // Changes were already committed by SelectionManager.saveAllChanges()
        }
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
  }, [pendingChanges, pendingChangesCount, saveAllChanges, refetchSelections, loadSavedSelections]);

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
