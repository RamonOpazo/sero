import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
// import { Badge } from "@/components/ui/badge";
import { Save, CheckCheck, RotateCcw } from "lucide-react";
import { useSelections } from "../../providers/selection-provider";
import { usePrompts } from "../../providers/prompt-provider";
import type { MinimalDocumentType, PromptType } from "@/types";
import { toast } from "sonner";
import { TypedConfirmationDialog } from "@/components/shared/typed-confirmation-dialog";
import type { TypedMessage } from "@/components/shared/typed-confirmation-dialog";

interface StageCommitCommanderProps {
  document: MinimalDocumentType;
}

export default function StageCommitCommander({ document }: StageCommitCommanderProps) {
  const {
    state: selectionState,
    allSelections,
    pendingChanges: selectionPending,
    pendingChangesCount: selectionPendingCount,
    save: saveSelections,
  } = useSelections();

  const {
    state: promptState,
    allPrompts,
    pendingChanges: promptPending,
    pendingChangesCount: promptPendingCount,
    save: savePrompts,
    updatePrompt,
    load: loadPrompts,
  } = usePrompts();

  const [isStaging, setIsStaging] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);

  // Selection stats
  const selectionStats = useMemo(() => {
    const persistedItems: any[] = (selectionState as any).persistedItems || [];
const committed = allSelections.filter((s: any) => s && s.state === 'committed').length;
    const stagedPersisted = persistedItems.filter((s: any) => s && (s.is_staged === true || (s.state && s.state !== 'committed'))).length;
    const created = selectionPending.creates.length;
    const updated = selectionPending.updates.length;
    const deleted = selectionPending.deletes.length;
    return { committed, stagedPersisted, created, updated, deleted, pending: selectionPendingCount };
  }, [selectionState, allSelections, selectionPending, selectionPendingCount]);

  // Prompt stats
  const promptStats = useMemo(() => {
    const persistedItems: any[] = (promptState as any).persistedItems || [];
const committed = allPrompts.filter((p: any) => p && p.state === 'committed').length;
    const stagedPersisted = persistedItems.filter((p: any) => p && (p.is_staged === true || (p.state && p.state !== 'committed'))).length;
    const created = promptPending.creates.length;
    const updated = promptPending.updates.length;
    const deleted = promptPending.deletes.length;
    return { committed, stagedPersisted, created, updated, deleted, pending: promptPendingCount };
  }, [promptState, allPrompts, promptPending, promptPendingCount]);

  const canStage = selectionStats.pending > 0 || promptStats.pending > 0;
  const canCommit = (selectionStats.stagedPersisted + selectionStats.created + selectionStats.updated) > 0
                 || (promptStats.stagedPersisted + promptStats.created + promptStats.updated) > 0;

  const handleStageAll = useCallback(async () => {
    if (!canStage) {
      toast.info('No pending changes to stage');
      return;
    }
    setIsStaging(true);
    try {
      const results = await Promise.allSettled([
        selectionStats.pending > 0 ? saveSelections() : Promise.resolve({ ok: true }) as any,
        promptStats.pending > 0 ? savePrompts() : Promise.resolve({ ok: true }) as any,
      ]);
      const ok = results.every(r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<any>).value?.ok !== false);
      if (!ok) {
        toast.error('Failed to stage some changes');
      } else {
        const parts: string[] = [];
        if (selectionStats.pending > 0) parts.push(`selections(${selectionStats.pending})`);
        if (promptStats.pending > 0) parts.push(`prompts(${promptStats.pending})`);
        toast.success(`Staged ${parts.join(' + ')}`);
      }
      if (typeof (selectionState as any).reload === 'function') {
        await (selectionState as any).reload();
      }
      await loadPrompts();
    } finally {
      setIsStaging(false);
    }
  }, [canStage, selectionStats.pending, promptStats.pending, saveSelections, savePrompts, selectionState, loadPrompts]);

  const handleCommitAll = useCallback(async () => {
    if (!canCommit) {
      toast.info('Nothing to commit');
      return;
    }
    setIsCommitting(true);
    try {
      // Ensure latest staged items are persisted first
      if (selectionStats.pending > 0) {
        const resSel = await saveSelections();
        if (!resSel.ok) {
          toast.error('Failed to stage selection changes before commit');
          setIsCommitting(false);
          return;
        }
      }
      if (promptStats.pending > 0) {
        const resPr = await savePrompts();
        if (!resPr.ok) {
          toast.error('Failed to stage prompt changes before commit');
          setIsCommitting(false);
          return;
        }
      }

      // 1) Commit selections via API endpoint (commits creations/editions and deletes staged deletions)
      const { DocumentViewerAPI } = await import('@/lib/document-viewer-api');
      const commitSel = await DocumentViewerAPI.commitStagedSelections(document.id, { commit_all: true });
      if (!commitSel.ok) {
        toast.error('Failed to commit selections');
        setIsCommitting(false);
        return;
      }

      // 2) Commit prompts by flipping staged prompts to committed via update calls
      const stagedPrompts: PromptType[] = allPrompts.filter(p => (p as any).is_staged === true || (p.state && p.state !== 'committed')) as any;
      if (stagedPrompts.length > 0) {
        await Promise.allSettled(stagedPrompts.map(p => updatePrompt(p.id, { state: 'committed' } as any)));
      }

      // Reload both providers
      if (typeof (selectionState as any).reload === 'function') {
        await (selectionState as any).reload();
      }
      await loadPrompts();

      toast.success('Committed all staged selections and prompts');
    } catch (e) {
      toast.error('Commit failed');
    } finally {
      setIsCommitting(false);
    }
  }, [canCommit, selectionStats.pending, promptStats.pending, saveSelections, savePrompts, document.id, allPrompts, updatePrompt, selectionState, loadPrompts]);

  const stageMessages = useMemo<TypedMessage[]>(() => {
    const msgs: TypedMessage[] = [];
    if (selectionStats.pending > 0) {
      msgs.push({
        variant: "info",
        title: "Selections will be staged",
        description: `${selectionStats.pending} pending selection change(s) will be saved as staged`,
      });
    }
    if (promptStats.pending > 0) {
      msgs.push({
        variant: "info",
        title: "Prompts will be staged",
        description: `${promptStats.pending} pending prompt change(s) will be saved as staged`,
      });
    }
    if (msgs.length === 0) {
      msgs.push({
        variant: "warning",
        title: "No pending changes",
        description: "There are no changes to stage.",
      });
    }
    return msgs;
  }, [selectionStats.pending, promptStats.pending]);

  const commitMessages = useMemo<TypedMessage[]>(() => {
    const totalToCommit = (selectionStats.stagedPersisted + selectionStats.created + selectionStats.updated)
      + (promptStats.stagedPersisted + promptStats.created + promptStats.updated);
    const msgs: TypedMessage[] = [];
    if (totalToCommit === 0) {
      msgs.push({
        variant: "warning",
        title: "Nothing to commit",
        description: "There are no staged changes to commit.",
      });
    } else {
      // Irreversibility warning first for emphasis
      msgs.push({
        variant: "warning",
        title: "Irreversible operation",
        description: "Once committed, changes cannot be undone from here.",
      });

      const selectionToCommit = selectionStats.stagedPersisted + selectionStats.created + selectionStats.updated;
      const promptToCommit = promptStats.stagedPersisted + promptStats.created + promptStats.updated;
      if (selectionToCommit > 0) {
        msgs.push({
          variant: "info",
          title: "Selections to commit",
          description: `${selectionToCommit} selection change(s) will be committed`,
        });
      }
      if (promptToCommit > 0) {
        msgs.push({
          variant: "info",
          title: "Prompts to commit",
          description: `${promptToCommit} prompt change(s) will be committed`,
        });
      }
      msgs.push({
        variant: "success",
        title: "Commit scope",
        description: "All staged selections and prompts will be marked as committed.",
      });
    }
    return msgs;
  }, [selectionStats.stagedPersisted, selectionStats.created, selectionStats.updated, promptStats.stagedPersisted, promptStats.created, promptStats.updated]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Selections</span>
          <div className="flex items-center justify-between ml-4">
            <span className="text-xs text-muted-foreground">Staged</span>
            <span className="text-xs font-mono">{selectionStats.stagedPersisted}</span>
          </div>
          <div className="flex items-center justify-between ml-4">
            <span className="text-xs text-muted-foreground">Committed</span>
            <span className="text-xs font-mono">{selectionStats.committed}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Prompts</span>
          <div className="flex items-center justify-between ml-4">
            <span className="text-xs text-muted-foreground">Staged</span>
            <span className="text-xs font-mono">{promptStats.stagedPersisted}</span>
          </div>
          <div className="flex items-center justify-between ml-4">
            <span className="text-xs text-muted-foreground">Committed</span>
            <span className="text-xs font-mono">{promptStats.committed}</span>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowCommitDialog(true)}
          disabled={!canCommit || isCommitting}
          className="w-full justify-start h-9 text-xs"
        >
          {isCommitting ? <RotateCcw className="mr-2 h-3 w-3 animate-spin" /> : <CheckCheck className="mr-2 h-3 w-3" />}
          {isCommitting ? 'Committing...' : 'Commit all staged'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowStageDialog(true)}
          disabled={!canStage || isStaging}
          className="w-full justify-start h-9 text-xs"
        >
          {isStaging ? <RotateCcw className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
          {isStaging ? 'Staging...' : 'Stage all changes'}
        </Button>
      </div>

      {/* Confirmation dialogs */}
      <TypedConfirmationDialog
        isOpen={showStageDialog}
        onClose={() => setShowStageDialog(false)}
        onConfirm={async () => {
          setShowStageDialog(false);
          await handleStageAll();
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
          await handleCommitAll();
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

