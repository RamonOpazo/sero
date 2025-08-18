import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, RotateCcw, AlertCircle, Trash2, FileX, Undo2 } from "lucide-react";
import { useViewportState } from "../core/ViewportState";
import { useSelections } from "../core/SelectionProvider";
import { api } from "@/lib/axios";
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
    commitChanges,
    loadSavedSelections,
    clearAll,
    clearPage,
    discardAllChanges,
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

  // Save all pending changes (creates, updates, deletes)
  const performSaveAllSelections = useCallback(async () => {
    if (pendingChangesCount === 0) {
      toast.info('No pending changes to save');
      return;
    }

    setIsSaving(true);
    
    try {
      const results = { creates: 0, updates: 0, deletes: 0, errors: 0 };
      
      // Handle creates (new selections)
      for (const sel of pendingChanges.creates) {
        try {
          const selectionData = {
            page_number: sel.page_number ?? null,
            x: sel.x,
            y: sel.y,
            width: sel.width,
            height: sel.height,
            confidence: null,
            document_id: document.id,
          };

          const result = await api.safe.post(
            `/documents/id/${document.id}/selections`,
            selectionData
          );

          if (result.ok) {
            results.creates++;
          } else {
            results.errors++;
            console.error('Failed to create selection:', result.error);
          }
        } catch (error) {
          results.errors++;
          console.error('Error creating selection:', error);
        }
      }

      // Handle updates (modified saved selections)
      for (const sel of pendingChanges.updates) {
        try {
          const selectionData = {
            page_number: sel.page_number ?? null,
            x: sel.x,
            y: sel.y,
            width: sel.width,
            height: sel.height,
            confidence: 'confidence' in sel ? sel.confidence : null,
            document_id: document.id,
          };

          const result = await api.safe.put(
            `/selections/id/${sel.id}`,
            selectionData
          );

          if (result.ok) {
            results.updates++;
          } else {
            results.errors++;
            console.error('Failed to update selection:', result.error);
          }
        } catch (error) {
          results.errors++;
          console.error('Error updating selection:', error);
        }
      }

      // Handle deletes (removed saved selections)
      for (const sel of pendingChanges.deletes) {
        try {
          const result = await api.safe.delete(
            `/selections/id/${sel.id}`
          );

          if (result.ok) {
            results.deletes++;
          } else {
            results.errors++;
            console.error('Failed to delete selection:', result.error);
          }
        } catch (error) {
          results.errors++;
          console.error('Error deleting selection:', error);
        }
      }

      // Show results
      const totalSuccess = results.creates + results.updates + results.deletes;
      
      if (totalSuccess > 0) {
        const messages = [];
        if (results.creates > 0) messages.push(`${results.creates} created`);
        if (results.updates > 0) messages.push(`${results.updates} updated`);
        if (results.deletes > 0) messages.push(`${results.deletes} deleted`);
        
        toast.success(`Successfully saved changes: ${messages.join(', ')}`);
        
        // Reload selections from backend to get updated IDs and state
        try {
          const freshSelections = await refetchSelections();
          if (freshSelections) {
            loadSavedSelections(freshSelections);
          }
        } catch (reloadError) {
          console.warn('Failed to reload selections after save:', reloadError);
          // Still commit changes even if reload fails
          commitChanges();
        }
      }

      if (results.errors > 0) {
        toast.error(`Failed to save ${results.errors} change${results.errors === 1 ? '' : 's'}`);
      }
      
    } catch (error) {
      console.error('Error saving selections:', error);
      toast.error('Failed to save selections');
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, pendingChangesCount, document.id, commitChanges, refetchSelections, loadSavedSelections]);

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
