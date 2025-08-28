import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { TypedMessage } from "@/components/shared/typed-confirmation-dialog";
import type { PromptType } from "@/types";
import { useSelections } from "../providers/selection-provider";
import { usePrompts } from "../providers/prompt-provider";
import { UISelectionStage } from "../types/selection-lifecycle";
import { DocumentViewerAPI } from "@/lib/document-viewer-api";

export interface StageCommitStats {
  committed: number;
  stagedPersisted: number;
  stagedCreation?: number;
  stagedEdition?: number;
  stagedDeletion?: number;
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
  commitAll: (autoStage?: boolean) => Promise<void>;
  clearSelections: (page?: number) => Promise<{ persistedCount: number; draftCount: number }>;
  stageMessages: TypedMessage[];
  commitMessages: TypedMessage[];
}

export function useStageCommit(documentId: string | number): UseStageCommitResult {
  const {
    state: selectionState,
    uiSelections,
    saveLifecycle,
    commitLifecycle,
    updateSelection,
    deleteSelection,
    reload,
  } = useSelections() as any;

  const {
    state: promptState,
    allPrompts,
    pendingChanges: promptPending,
    save: savePrompts,
    updatePrompt,
    load: loadPrompts,
  } = usePrompts();

  const [isStaging, setIsStaging] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // Selection stats
  const selectionStats = useMemo<StageCommitStats>(() => {
    const committed = (uiSelections || []).filter((s: any) => s.stage === UISelectionStage.Committed).length;
    const stagedCreation = (uiSelections || []).filter((s: any) => s.stage === UISelectionStage.StagedCreation).length;
    const stagedEdition = (uiSelections || []).filter((s: any) => s.stage === UISelectionStage.StagedEdition).length;
    const stagedDeletion = (uiSelections || []).filter((s: any) => s.stage === UISelectionStage.StagedDeletion).length;
    const stagedPersisted = stagedCreation + stagedEdition + stagedDeletion;
    const created = (uiSelections || []).filter((s: any) => s.isPersisted === false).length;
    const updated = (uiSelections || []).filter((s: any) => s.isPersisted === true && s.stage === UISelectionStage.Unstaged && s.dirty === true).length;
    const deleted = 0;
    const pending = (uiSelections || []).filter((s: any) => s.dirty === true).length;
    return { committed, stagedPersisted, stagedCreation, stagedEdition, stagedDeletion, created, updated, deleted, pending } as StageCommitStats;
  }, [uiSelections]);

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

  const canStage = selectionStats.pending > 0
                 || selectionStats.stagedPersisted > 0
                 || promptStats.pending > 0
                 || promptStats.stagedPersisted > 0;
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
        (selectionStats.pending > 0 || selectionStats.stagedPersisted > 0) ? saveLifecycle() : Promise.resolve({ ok: true }) as any,
        (promptStats.pending > 0 || promptStats.stagedPersisted > 0) ? savePrompts() : Promise.resolve({ ok: true }) as any,
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
      await loadPrompts();
    } finally {
      setIsStaging(false);
    }
  }, [canStage, selectionStats.pending, promptStats.pending, saveLifecycle, savePrompts, selectionState, loadPrompts]);

  const clearSelections = useCallback(async (page?: number): Promise<{ persistedCount: number; draftCount: number }> => {
    const scoped = (uiSelections as any[]).filter(sel => (typeof page === 'number' ? sel.page_number === page : true));
    const persisted = scoped.filter((s: any) => s.isPersisted);
    const drafts = scoped.filter((s: any) => !s.isPersisted);

    // Phase 1: ensure persisted items are staged_edition on the server; remove drafts locally
    try {
      // Convert committed items via dedicated API (server authoritative)
      const committed = persisted.filter((s: any) => s.stage === UISelectionStage.Committed);
      if (committed.length > 0) {
        await Promise.allSettled(committed.map((s: any) => DocumentViewerAPI.convertSelectionToStaged(s.id)));
      }

      // For non-committed persisted but not staged_edition, mark locally to staged_edition and save
      let needsSave = false;
      const nonCommitted = persisted.filter((s: any) => s.stage !== UISelectionStage.Committed);
      for (const sel of nonCommitted) {
        if (sel.stage !== UISelectionStage.StagedEdition) {
          updateSelection(sel.id, { state: 'staged_edition' } as any);
          needsSave = true;
        }
      }

      // Remove drafts locally
      for (const sel of drafts) {
        deleteSelection(sel.id);
        needsSave = true; // reflect local deletion persistence of drafts (no server call needed, but lifecycle save clears local state)
      }

      if (needsSave) {
        await saveLifecycle();
      }

      // Reload to sync authoritative state after conversions
      await reload();
    } catch (e) {
      // proceed to phase 2
    }

    // Phase 2: stage deletions for persisted; then persist staging and reload (server authoritative)
    try {
      if (persisted.length > 0) {
        await Promise.allSettled(persisted.map((s: any) => DocumentViewerAPI.updateSelection(s.id, { state: 'staged_deletion' } as any)));
        await reload();
      }
    } catch (e) {
      // swallow
    }

    return { persistedCount: persisted.length, draftCount: drafts.length };
  }, [uiSelections, updateSelection, deleteSelection, saveLifecycle, reload]);

  const commitAll = useCallback(async (autoStage: boolean = false) => {
    if (!canCommit) {
      toast.info('Nothing to commit');
      return;
    }
    setIsCommitting(true);
    try {
      // Optionally stage latest pending items first
      if (autoStage) {
        if (selectionStats.pending > 0 || selectionStats.stagedPersisted > 0) {
          const resSel = await saveLifecycle();
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
      }

      // 1) Commit selections via API endpoint (commits creations/editions and deletes staged deletions)
      const commitSel = await commitLifecycle();
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
      await loadPrompts();

      toast.success('Committed all staged selections and prompts');
    } catch (e) {
      toast.error('Commit failed');
    } finally {
      setIsCommitting(false);
    }
  }, [canCommit, selectionStats.pending, selectionStats.stagedPersisted, promptStats.pending, saveLifecycle, savePrompts, documentId, allPrompts, updatePrompt, selectionState, loadPrompts]);

  const stageMessages = useMemo<TypedMessage[]>(() => {
    const msgs: TypedMessage[] = [];
    if (selectionStats.pending > 0 || selectionStats.stagedPersisted > 0) {
      const total = selectionStats.pending + selectionStats.stagedPersisted;
      msgs.push({
        variant: "info",
        title: "Selections will be staged",
        description: `${total} selection change(s) will be saved as staged`,
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
  }, [selectionStats.pending, selectionStats.stagedPersisted, promptStats.pending]);

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
    clearSelections,
    stageMessages,
    commitMessages,
  };
}

