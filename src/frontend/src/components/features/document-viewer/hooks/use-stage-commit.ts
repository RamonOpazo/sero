import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { TypedMessage } from "@/components/shared/typed-confirmation-dialog";
import type { PromptType } from "@/types";
import { useSelections } from "../providers/selection-provider";
import { usePrompts } from "../providers/prompt-provider";

export interface StageCommitStats {
  committed: number;
  stagedPersisted: number;
  created: number;
  updated: number;
  deleted: number;
  pending: number;
}

export interface UseStageCommitResult {
  selectionStats: StageCommitStats;
  promptStats: StageCommitStats;
  canStage: boolean;
  canCommit: boolean;
  isStaging: boolean;
  isCommitting: boolean;
  stageAll: () => Promise<void>;
  commitAll: () => Promise<void>;
  stageMessages: TypedMessage[];
  commitMessages: TypedMessage[];
}

export function useStageCommit(documentId: string | number): UseStageCommitResult {
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

  // Selection stats
  const selectionStats = useMemo<StageCommitStats>(() => {
    const persistedItems: any[] = (selectionState as any).persistedItems || [];
    const committed = allSelections.filter((s: any) => s && (s as any).state === 'committed').length;

    const pendingUpdateIds = new Set<string>((selectionPending.updates || []).map((u: any) => u?.id).filter(Boolean));

    // Determine which persisted items are effectively staged on the backend (or already persisted as staged)
    const persistedStagedIds = new Set<string>(
      persistedItems
        .filter((s: any) => s && (((s as any).is_staged === true) || (((s as any).state && (s as any).state !== 'committed') && !pendingUpdateIds.has((s as any).id))))
        .map((s: any) => (s as any).id)
        .filter(Boolean)
    );

    const stagedPersisted = persistedStagedIds.size;

    // Filter pending changes so we don't double-count items whose local pending change is a state flip to a staged_* and
    // the item is already considered stagedPersisted (because the UI shows it as staged)
    const filteredCreates = (selectionPending.creates || []); // new items are genuinely unstaged until saved

    const filteredUpdates = (selectionPending.updates || []).filter((u: any) => {
      const id = u?.id;
      const stateStr = u?.state;
      // If this update is merely setting a staged state and the item is already counted as stagedPersisted, exclude
      if (id && persistedStagedIds.has(id) && stateStr && stateStr !== 'committed') return false;
      return true;
    });

    const filteredDeletes = (selectionPending.deletes || []).filter((d: any) => {
      const id = d?.id;
      // If the item is already considered stagedPersisted (e.g., staged_deletion), exclude it from unstaged deletes
      if (id && persistedStagedIds.has(id)) return false;
      return true;
    });

    const created = filteredCreates.length;
    const updated = filteredUpdates.length;
    const deleted = filteredDeletes.length;
    const pending = created + updated + deleted;

    return { committed, stagedPersisted, created, updated, deleted, pending };
  }, [selectionState, allSelections, selectionPending]);

  // Prompt stats
  const promptStats = useMemo<StageCommitStats>(() => {
    const persistedItems: any[] = (promptState as any).persistedItems || [];
    const committed = allPrompts.filter((p: any) => p && (p as any).state === 'committed').length;
    const pendingUpdateIds = new Set<string>((promptPending.updates || []).map((u: any) => u?.id).filter(Boolean));

    const persistedStagedIds = new Set<string>(
      persistedItems
        .filter((p: any) => p && (((p as any).is_staged === true) || (((p as any).state && (p as any).state !== 'committed') && !pendingUpdateIds.has((p as any).id))))
        .map((p: any) => (p as any).id)
        .filter(Boolean)
    );

    const stagedPersisted = persistedStagedIds.size;

    const filteredCreates = (promptPending.creates || []);
    const filteredUpdates = (promptPending.updates || []).filter((u: any) => {
      const id = u?.id;
      const stateStr = u?.state;
      if (id && persistedStagedIds.has(id) && stateStr && stateStr !== 'committed') return false;
      return true;
    });
    const filteredDeletes = (promptPending.deletes || []).filter((d: any) => {
      const id = d?.id;
      if (id && persistedStagedIds.has(id)) return false;
      return true;
    });

    const created = filteredCreates.length;
    const updated = filteredUpdates.length;
    const deleted = filteredDeletes.length;
    const pending = created + updated + deleted;

    return { committed, stagedPersisted, created, updated, deleted, pending };
  }, [promptState, allPrompts, promptPending]);

  const canStage = selectionStats.pending > 0 || promptStats.pending > 0;
  const canCommit = (selectionStats.stagedPersisted + selectionStats.created + selectionStats.updated) > 0
                 || (promptStats.stagedPersisted + promptStats.created + promptStats.updated) > 0;

  const stageAll = useCallback(async () => {
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

  const commitAll = useCallback(async () => {
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
      const commitSel = await DocumentViewerAPI.commitStagedSelections(documentId as any, { commit_all: true });
      if (!commitSel.ok) {
        toast.error('Failed to commit selections');
        setIsCommitting(false);
        return;
      }

      // 2) Commit prompts by flipping staged prompts to committed via update calls
      const stagedPrompts: PromptType[] = allPrompts.filter(p => (p as any).is_staged === true || ((p as any).state && (p as any).state !== 'committed')) as any;
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
  }, [canCommit, selectionStats.pending, promptStats.pending, saveSelections, savePrompts, documentId, allPrompts, updatePrompt, selectionState, loadPrompts]);

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

  return {
    selectionStats,
    promptStats,
    canStage,
    canCommit,
    isStaging,
    isCommitting,
    stageAll,
    commitAll,
    stageMessages,
    commitMessages,
  };
}

