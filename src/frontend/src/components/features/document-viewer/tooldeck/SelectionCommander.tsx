import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    selectedSelection,
    allSelections,
    hasUnsavedChanges,
    saveNewSelections,
    clearAll,
    clearPage,
  } = useSelections();
  
  const [isSaving, setIsSaving] = useState(false);

  // Calculate selection statistics
  const selectionStats = useMemo(() => {
    const newCount = selectionState.newSelections.length;
    const existingCount = selectionState.savedSelections.length;
    const totalCount = allSelections.length;
    
    // Count ALL unsaved changes: new selections + modifications to saved selections
    // Compare current saved selections with initial state to find modified ones
    const initialSavedSelections = selectionState.initialState.savedSelections;
    const modifiedSavedCount = selectionState.savedSelections.filter(currentSelection => {
      const initialSelection = initialSavedSelections.find(initial => initial.id === currentSelection.id);
      if (!initialSelection) {
        // This selection wasn't in the initial state, but it's in saved now
        // This can happen when new selections are saved, so don't count as "modified"
        return false;
      }
      
      // Check if any properties have changed from the initial state
      return (
        currentSelection.x !== initialSelection.x ||
        currentSelection.y !== initialSelection.y ||
        currentSelection.width !== initialSelection.width ||
        currentSelection.height !== initialSelection.height ||
        currentSelection.page_number !== initialSelection.page_number
      );
    }).length;
    
    const totalUnsavedChanges = newCount + modifiedSavedCount;
    const hasUnsavedChanges = totalUnsavedChanges > 0;
    
    return {
      newCount,
      existingCount,
      totalCount,
      modifiedSavedCount,
      totalUnsavedChanges,
      hasUnsavedChanges
    };
  }, [selectionState.newSelections, selectionState.savedSelections, selectionState.initialState, allSelections]);

  // Save all new selections
  const handleSaveAllSelections = useCallback(async () => {
    if (selectionState.newSelections.length === 0) {
      toast.info('No unsaved selections to save');
      return;
    }

    setIsSaving(true);
    
    try {
      const savePromises = selectionState.newSelections.map(async (sel) => {
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
          return { success: true, selection: result.value };
        } else {
          throw new Error((result.error as any)?.response?.data?.detail || 'Failed to save selection');
        }
      });

      const results = await Promise.allSettled(savePromises);
      const successful = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map(r => r.value);
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

      if (successful.length > 0) {
        const savedSelections = successful.map(s => ({ ...s.selection, id: s.selection.id }));
        saveNewSelections(savedSelections);
        toast.success(`Successfully saved ${successful.length} selection${successful.length === 1 ? '' : 's'}`);
      }

      if (failed.length > 0) {
        toast.error(`Failed to save ${failed.length} selection${failed.length === 1 ? '' : 's'}`);
        console.error('Failed to save selections:', failed);
      }
    } catch (error) {
      console.error('Error saving selections:', error);
      toast.error('Failed to save selections');
    } finally {
      setIsSaving(false);
    }
  }, [selectionState.newSelections, document.id, saveNewSelections]);

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
          disabled={isSaving || selectionStats.newCount === 0 || isViewingProcessedDocument}
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
