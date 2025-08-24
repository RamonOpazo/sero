import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RotateCcw, AlertCircle, Trash2, FileX, Undo2, Brain, Save, CheckCheck } from "lucide-react";
import { useViewportState } from "../../providers/viewport-provider";
import { useSelections } from "../../providers/selection-provider";
import { toast } from "sonner";
import { useState, useCallback, useMemo, useEffect } from "react";
import type { MinimalDocumentType } from "@/types";
import { TypedConfirmationDialog } from "@/components/shared/typed-confirmation-dialog";
import { useStageCommit } from "../../hooks/use-stage-commit";
import SelectionsList from "./selection-list";

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
    clearAll,
    clearPage,
    discardAllChanges,
  } = useSelections();

  const [isApplyingAI, setIsApplyingAI] = useState(false);
  const { selectionStats: scSel, canStage, canCommit, isStaging, isCommitting, stageAll, commitAll, stageMessages, commitMessages } = useStageCommit(document.id);
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);

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

  // Single consolidated debug log for selections only
  useEffect(() => {
    const committed = scSel.committed;
    const creates = scSel.created;
    const updates = scSel.updated;
    const deletes = scSel.deleted;
    const unstaged = scSel.pending; // creates + updates + deletes

    // eslint-disable-next-line no-console
    console.log(`Selections:
      \tUNSTAGED: ${unstaged}
      \tSTAGED_CREATION: ${creates}
      \tSTAGED_EDITION: ${updates}
      \tSTAGED_DELETION: ${deletes}
      \tCOMMITTED: ${committed}`
    )});

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

      {/* Stage & Commit Controls */}
      <div className="flex flex-col gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowCommitDialog(true)}
          disabled={!canCommit || isCommitting || isViewingProcessedDocument}
          className="w-full justify-start h-9 text-xs"
        >
          {isCommitting ? <RotateCcw className="mr-2 h-3 w-3 animate-spin" /> : <CheckCheck className="mr-2 h-3 w-3" />}
          {isCommitting ? 'Committing...' : 'Commit all staged'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowStageDialog(true)}
          disabled={!canStage || isStaging || isViewingProcessedDocument}
          className="w-full justify-start h-9 text-xs"
        >
          {isStaging ? <RotateCcw className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
          {isStaging ? 'Staging...' : 'Stage all changes'}
        </Button>
      </div>

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
          {isApplyingAI ? 'Applying AI...' : 'Apply AI'}
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

      {/* Confirmation dialogs for staging and committing */}
      <TypedConfirmationDialog
        isOpen={showStageDialog}
        onClose={() => setShowStageDialog(false)}
        onConfirm={async () => {
          setShowStageDialog(false);
          await stageAll();
        }}
        title="Stage all changes"
        description="This will stage all pending selections and prompt changes for this document."
        confirmationText="stage"
        confirmButtonText="Stage all"
        cancelButtonText="Cancel"
        variant="default"
        messages={stageMessages}
      />

      <TypedConfirmationDialog
        isOpen={showCommitDialog}
        onClose={() => setShowCommitDialog(false)}
        onConfirm={async () => {
          setShowCommitDialog(false);
          await commitAll();
        }}
        title="Commit all staged"
        description="This will commit all staged selections and prompts. This action is irreversible."
        confirmationText="commit"
        confirmButtonText="Commit all staged"
        cancelButtonText="Cancel"
        variant="default"
        messages={commitMessages}
      />

    </div>
  );
}
