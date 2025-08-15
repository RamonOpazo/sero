import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, FileText, FileWarning, Trash2, Download, Save, RotateCcw, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { WidgetContainer, Widget, WidgetHeader, WidgetTitle, WidgetBody } from "@/components/shared/Widget";
import SelectionList from "./SelectionsList";
import PromptList from "./PromptsList";
import type { MinimalDocumentType } from "@/types";
import { useViewportState } from "./core/ViewportState";
import { useSelections } from "./core/SelectionProvider";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { useState, useCallback, useMemo } from "react";
type Props = { document: MinimalDocumentType };

export default function Controller({ document, className, ...props }: Props & React.ComponentProps<"div">) {
  // Viewport state for non-selection state
  const { isViewingProcessedDocument, dispatch, showSelections } = useViewportState();
  
  // New selection system
  const {
    state: selectionState,
    allSelections,
    hasUnsavedChanges,
    clearAll,
    saveNewSelections,
  } = useSelections();
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  const setIsViewingProcessedDocument = (value: boolean | ((prev: boolean) => boolean)) => {
    const newValue = typeof value === 'function' ? value(isViewingProcessedDocument) : value;
    dispatch({ type: 'SET_VIEWING_PROCESSED', payload: newValue });
  };
  
  const handleDownloadFile = () => {
    // Simple download using the blob from the document
    const currentFile = isViewingProcessedDocument ? document.redacted_file : document.original_file;
    if (currentFile && document.files) {
      const fileWithBlob = document.files.find(f => f.id === currentFile.id);
      if (fileWithBlob && 'blob' in fileWithBlob && fileWithBlob.blob instanceof Blob) {
        const url = URL.createObjectURL(fileWithBlob.blob);
        const link = globalThis.document.createElement('a');
        link.href = url;
        link.download = `${document.name}_${isViewingProcessedDocument ? 'redacted' : 'original'}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  // Calculate selection statistics from new system
  const selectionStats = useMemo(() => {
    const newCount = selectionState.newSelections.length;
    const existingCount = selectionState.savedSelections.length;
    const totalCount = allSelections.length;
    
    return {
      newCount,
      existingCount,
      totalCount,
      hasUnsavedChanges // From the new system
    };
  }, [selectionState.newSelections, selectionState.savedSelections, allSelections, hasUnsavedChanges]);

  // Save all new selections using new system
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
          confidence: null, // Manual selections have no confidence
          document_id: document.id,
        };

        const result = await api.safe.post(
          `/documents/id/${document.id}/selections`,
          selectionData
        );

        if (result.ok) {
          return { success: true, selection: result.value };
        } else {
          throw new Error((result.error as any)?.response?.data?.detail || (result.error as any)?.message || 'Failed to save selection');
        }
      });

      const results = await Promise.allSettled(savePromises);
      const successful = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map(r => r.value);
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

      if (successful.length > 0) {
        // Use new system to save selections
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

  // Clear all selections using new system
  const handleClearAllSelections = useCallback(async () => {
    if (selectionStats.totalCount === 0) {
      toast.info('No selections to clear');
      return;
    }

    setIsClearing(true);
    
    try {
      // Use new system's clearAll method
      clearAll();
      toast.success('All selections cleared');
    } catch (error) {
      console.error('Error clearing selections:', error);
      toast.error('Failed to clear selections');
    } finally {
      setIsClearing(false);
    }
  }, [clearAll, selectionStats.totalCount]);

  const toggleSelectionVisibility = useCallback(() => {
    dispatch({ type: 'SET_SHOW_SELECTIONS', payload: !showSelections });
  }, [dispatch, showSelections]);

  return (
    <WidgetContainer
      data-slot="document-viewer-controller"
      expanded
      className={cn(
        "gap-2 p-2",
        className
      )} {...props}
    >
      {/* Document Status */}
      <Badge variant={isViewingProcessedDocument ? "destructive" : "secondary"} className="text-xs w-fit mx-4">
        {isViewingProcessedDocument ? "Redacted" : "Original"}
      </Badge>

      {/* Document View Widget */}
      <Widget className="py-2">
        <WidgetHeader className="pb-1">
          <WidgetTitle className="text-xs flex items-center gap-1">
            {isViewingProcessedDocument ? <FileWarning className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            Document View
          </WidgetTitle>
        </WidgetHeader>
        <WidgetBody className="pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsViewingProcessedDocument(prev => !prev)}
            className="w-full justify-start h-8 text-xs"
          >
            {isViewingProcessedDocument ? <FileText className="mr-2 h-3 w-3" /> : <FileWarning className="mr-2 h-3 w-3" />}
            {isViewingProcessedDocument ? 'View Original' : 'View Redacted'}
          </Button>
        </WidgetBody>
      </Widget>

      {/* Selection Controls Widget */}
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

      {/* Selection List Widget */}
      <SelectionList />

      {/* Document Actions Widget */}
      <Widget className="py-2">
        <WidgetHeader className="pb-1">
          <WidgetTitle className="text-xs flex items-center gap-1">
            <Brain className="h-3 w-3" />
            Actions
          </WidgetTitle>
        </WidgetHeader>
        <WidgetBody className="pt-0">
          <div className="space-y-1">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isViewingProcessedDocument}
              className="w-full justify-start h-8 text-xs"
            >
              <Brain className="mr-2 h-3 w-3" />
              Redact File
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadFile}
              className="w-full justify-start h-8 text-xs"
            >
              <Download className="mr-2 h-3 w-3" />
              Download File
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              className="w-full justify-start h-8 text-xs"
            >
              <Trash2 className="mr-2 h-3 w-3" />
              Delete File
            </Button>
          </div>
        </WidgetBody>
      </Widget>

      {/* Prompts Widget */}
      <PromptList documentId={document.id} />
    </WidgetContainer>
  );
}
