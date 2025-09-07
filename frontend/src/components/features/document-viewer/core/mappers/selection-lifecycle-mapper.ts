// Mapper utilities to convert between API Selection and UISelection lifecycle model

import type { SelectionCreateType } from "@/types";
import type { Selection } from "../../types/viewer";
import { UILifecycleStage, type UISelectionLifecycle } from "../../types/lifecycle";

export function fromApiSelection(sel: Selection): UISelectionLifecycle {
  const state = (sel as any).state as string | undefined;
  const stage =
    state === "staged_edition"
      ? UILifecycleStage.StagedEdition
      : state === "staged_deletion"
      ? UILifecycleStage.StagedDeletion
      : state === "staged_creation"
      ? UILifecycleStage.StagedCreation
      : UILifecycleStage.Committed;

  return {
    ...(sel as any),
    stage,
    isSaved: true,
    isDirty: false,
  } as UISelectionLifecycle;
}

export function toApiCreate(sel: UISelectionLifecycle): SelectionCreateType {
  // Assume caller ensures sel.isPersisted === false
  // We let server decide final state; include known fields for create
  const { id: _id, dirty: _dirty, dirtyFields: _df, isPersisted: _p, stage: _st, ...rest } = sel as any;
  return rest as SelectionCreateType;
}

export function toApiUpdate(sel: UISelectionLifecycle): Partial<Selection> {
  // Only include fields likely relevant to an update
  // For now, include stage as mapped to API state; refine with dirtyFields in later PRs
  const state =
    sel.stage === UILifecycleStage.StagedEdition
      ? "staged_edition"
      : sel.stage === UILifecycleStage.StagedDeletion
      ? "staged_deletion"
      : sel.stage === UILifecycleStage.StagedCreation
      ? "staged_creation"
      : "committed";

  return { state } as Partial<Selection>;
}

export function mergeServerResponse(sel: UISelectionLifecycle, apiSel: Selection): UISelectionLifecycle {
  const merged = { ...sel, ...(apiSel as any) } as UISelectionLifecycle;
  const state = (merged as any).state as string | undefined;
  merged.stage =
    state === "staged_edition"
      ? UILifecycleStage.StagedEdition
      : state === "staged_deletion"
      ? UILifecycleStage.StagedDeletion
      : state === "staged_creation"
      ? UILifecycleStage.StagedCreation
      : UILifecycleStage.Committed;
  merged.isSaved = true;
  merged.isDirty = false;
  return merged;
}

