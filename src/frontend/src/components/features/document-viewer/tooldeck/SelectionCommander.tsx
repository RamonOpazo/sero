import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, RotateCcw, AlertCircle, Trash2, FileX } from "lucide-react";
import { useViewportState } from "../core/ViewportState";
import { useSelections } from "../core/SelectionProvider";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { useState, useCallback, useMemo } from "react";
import type { MinimalDocumentType } from "@/types";

interface SelectionControlsProps {
  document: MinimalDocumentType;
}

/**
 * Selection controls component
 * Manages selection visibility, saving, and clearing operations
 */
export default function SelectionControls({ document }: SelectionControlsProps) {
  const { isViewingProcessedDocument, currentPage } = useViewportState();
  
  const {
    state: selectionState,
    allSelections,
    pendingChanges,
    pendingChangesCount,
    commitChanges,
    clearAll,
    clearPage,
  } = useSelections();
  
  const [isSaving, setIsSaving] = useState(false);

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
  const handleSaveAllSelections = useCallback(async () => {
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
            `/documents/id/${document.id}/selections/${sel.id}`,
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
            `/documents/id/${document.id}/selections/${sel.id}`
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
        
        // Commit changes to update the initial state and clear pending changes
        commitChanges();
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
  }, [pendingChanges, pendingChangesCount, document.id, commitChanges]);

  // Clear all selections
  const handleClearAll = useCallback(() => {
    if (allSelections.length === 0) {
      toast.info('No selections to clear');
      return;
    }
    
    clearAll();
    toast.success(`Cleared all ${allSelections.length} selections`);
  }, [clearAll, allSelections.length]);

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
    <div className="space-y-4">
      {/* Selection Statistics */}
      <div className="space-y-2">
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
      <div className="space-y-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleSaveAllSelections}
          disabled={isSaving || selectionStats.totalUnsavedChanges === 0 || isViewingProcessedDocument}
          className="w-full h-9 text-xs"
        >
          {isSaving ? (
            <RotateCcw className="h-3 w-3 animate-spin mr-2" />
          ) : (
            <Save className="h-3 w-3 mr-2" />
          )}
          Save all changes
        </Button>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearPage}
            disabled={isViewingProcessedDocument || allSelections.filter(s => s.page_number === currentPage).length === 0}
            className="h-9 text-xs"
          >
            <FileX className="h-3 w-3 mr-1" />
            Clear page
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearAll}
            disabled={isViewingProcessedDocument || allSelections.length === 0}
            className="h-9 text-xs"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        </div>
      </div>
    </div>
  );
}
