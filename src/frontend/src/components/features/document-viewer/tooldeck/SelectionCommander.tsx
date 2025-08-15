import { Button } from "@/components/ui/button";
import { Widget, WidgetHeader, WidgetTitle, WidgetBody } from "@/components/shared/Widget";
import { Save, RotateCcw, Eye, EyeOff, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
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
  const { isViewingProcessedDocument, dispatch, showSelections } = useViewportState();
  
  const {
    state: selectionState,
    allSelections,
    hasUnsavedChanges,
    clearAll,
    saveNewSelections,
  } = useSelections();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Calculate selection statistics
  const selectionStats = useMemo(() => {
    const newCount = selectionState.newSelections.length;
    const existingCount = selectionState.savedSelections.length;
    const totalCount = allSelections.length;
    
    return {
      newCount,
      existingCount,
      totalCount,
      hasUnsavedChanges
    };
  }, [selectionState.newSelections, selectionState.savedSelections, allSelections, hasUnsavedChanges]);

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
          page_number: sel.page_number || null,
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
  const handleClearAllSelections = useCallback(async () => {
    if (selectionStats.totalCount === 0) {
      toast.info('No selections to clear');
      return;
    }

    setIsClearing(true);
    
    try {
      clearAll();
      toast.success('All selections cleared');
    } catch (error) {
      console.error('Error clearing selections:', error);
      toast.error('Failed to clear selections');
    } finally {
      setIsClearing(false);
    }
  }, [clearAll, selectionStats.totalCount]);

  // Toggle selection visibility
  const toggleSelectionVisibility = useCallback(() => {
    dispatch({ type: 'SET_SHOW_SELECTIONS', payload: !showSelections });
  }, [dispatch, showSelections]);

  return (
    <Widget className="py-2">
      <WidgetHeader className="pb-1">
        <div className="flex items-center justify-between">
          <WidgetTitle className="text-xs flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Selections
            {selectionStats.hasUnsavedChanges && <AlertCircle className="h-3 w-3 text-amber-500" />}
          </WidgetTitle>
          <div className="text-xs text-muted-foreground">
            {selectionStats.totalCount}
            {selectionStats.newCount > 0 && (
              <span className="text-amber-600 ml-1">({selectionStats.newCount})</span>
            )}
          </div>
        </div>
      </WidgetHeader>
      <WidgetBody className="pt-0">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectionVisibility}
            className="h-8 px-2 text-xs"
          >
            {showSelections ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSaveAllSelections}
            disabled={isSaving || selectionStats.newCount === 0 || isViewingProcessedDocument}
            className="h-8 px-2 text-xs flex-1"
          >
            {isSaving ? (
              <RotateCcw className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearAllSelections}
            disabled={isClearing || selectionStats.totalCount === 0}
            className="h-8 px-2 text-xs"
          >
            {isClearing ? (
              <RotateCcw className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </WidgetBody>
    </Widget>
  );
}
