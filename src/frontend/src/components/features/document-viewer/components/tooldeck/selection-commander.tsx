import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RotateCcw, AlertCircle, Trash2, FileX, Undo2, Brain, Save, CheckCheck } from "lucide-react";
import { useViewportState } from "../../providers/viewport-provider";
import { useSelections } from "../../providers/selection-provider";
import { toast } from "sonner";
import { useState, useCallback, useMemo } from "react";
import type { MinimalDocumentType } from "@/types";
import { TypedConfirmationDialog } from "@/components/shared/typed-confirmation-dialog";
import type { TypedMessage } from "@/components/shared/typed-confirmation-dialog";
import { Switch } from "@/components/ui/switch";
import { useStageCommit } from "../../hooks/use-stage-commit";
import { UISelectionStage } from "../../types/selection-lifecycle";

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
    uiSelections,
    allSelections,
    clearAll,
    clearPage,
    discardAllChanges,
  } = useSelections() as any;

  const [isApplyingAI, setIsApplyingAI] = useState(false);
  const { selectionStats: scSel, promptStats: prSel, canStage, canCommit, isStaging, isCommitting, stageAll, commitAll, stageMessages } = useStageCommit(document.id) as any;
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [commitAutoStage, setCommitAutoStage] = useState(false);

  // Calculate selection statistics using lifecycle uiSelections
  const selectionStats = useMemo(() => {
    const ui = (uiSelections || []) as any[];
    const newCount = ui.filter(s => s.isPersisted === false).length;
    const existingCount = ui.filter(s => s.isPersisted === true).length;
    const totalCount = ui.length;
    const modifiedSavedCount = ui.filter(s => s.isPersisted === true && s.dirty === true).length;
    const pendingDeletionsCount = ui.filter(s => s.stage === UISelectionStage.StagedDeletion).length;
    const totalUnsavedChanges = ui.filter(s => s.dirty === true).length;
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
  }, [uiSelections]);

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
    const pageSelections = allSelections.filter((sel: any) => sel.page_number === currentPage);
    if (pageSelections.length === 0) {
      toast.info(`No selections on page ${currentPage + 1}`);
      return;
    }

    clearPage(currentPage);
    toast.success(`Cleared ${pageSelections.length} selections from page ${currentPage + 1}`);
  }, [clearPage, currentPage, allSelections]);

  // Build commit dialog messages with correct counts depending on auto-stage
  const commitDialogMessages = useMemo<TypedMessage[]>(() => {
    const selectionsToCommit = commitAutoStage
      ? (scSel.stagedPersisted + scSel.created + scSel.updated)
      : scSel.stagedPersisted;
    const promptsToCommit = commitAutoStage
      ? (prSel.stagedPersisted + prSel.created + prSel.updated + (prSel.deleted || 0))
      : prSel.stagedPersisted;
    const totalToCommit = selectionsToCommit + promptsToCommit;
    const msgs: TypedMessage[] = [];

    if (totalToCommit === 0) {
      msgs.push({
        variant: 'warning',
        title: 'Nothing to commit',
        description: 'There are no changes to commit.',
      });
      return msgs;
    }

    // Irreversibility warning first
    msgs.push({
      variant: 'warning',
      title: 'Irreversible operation',
      description: 'Once committed, changes cannot be undone from here.',
    });

    if (selectionsToCommit > 0) {
      msgs.push({
        variant: 'info',
        title: 'Selections to commit',
        description: `${selectionsToCommit} selection change(s) will be committed`,
      });
    }
    if (promptsToCommit > 0) {
      msgs.push({
        variant: 'info',
        title: 'Prompts to commit',
        description: `${promptsToCommit} prompt change(s) will be committed`,
      });
    }

    msgs.push({
      variant: 'success',
      title: 'Commit scope',
      description: commitAutoStage
        ? 'Unstaged changes will be staged and committed in one step.'
        : 'Only currently staged changes will be committed.',
    });

    return msgs;
  }, [scSel.stagedPersisted, scSel.created, scSel.updated, prSel.stagedPersisted, prSel.created, prSel.updated, prSel.deleted, commitAutoStage]);

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
          {isApplyingAI ? 'Applying AI...' : 'Apply AI'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleClearPage}
          disabled={isViewingProcessedDocument || allSelections.filter((s: any) => s.page_number === currentPage).length === 0}
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
          await commitAll(commitAutoStage);
          setCommitAutoStage(false);
        }}
        title="Commit all staged"
        description={undefined}
        confirmationText="commit"
        confirmButtonText="Commit"
        cancelButtonText="Cancel"
        variant="default"
        messages={(() => {
          const autoMsg: TypedMessage = commitAutoStage
            ? { variant: 'warning', title: 'Auto-stage is ON', description: 'Pending changes will be staged and committed in one step.' }
            : {
                variant: 'info',
                title: 'Optional: auto-stage before commit',
                description: 'If enabled, any unstaged changes will be staged first, then committed. This may hide which changes were staged vs pre-staged.',
                className: 'border-muted/40 bg-muted/20 [&>svg]:text-muted-foreground *:data-[slot=alert-title]:text-muted-foreground *:data-[slot=alert-description]:text-muted-foreground/80',
              };
          return [...commitDialogMessages, autoMsg];
        })()}
        formFields={[
          (
            <div key="autostage" className="flex items-center justify-between text-xs p-2 border rounded">
              <div className="flex flex-col">
                <span className="font-medium">Auto-stage before commit</span>
                <span className="text-muted-foreground">Stage pending changes first, then commit</span>
              </div>
              <Switch checked={commitAutoStage} onCheckedChange={setCommitAutoStage} />
            </div>
          )
        ]}
      />

    </div>
  );
}
