// Mapper utilities to convert between API Selection and UISelection lifecycle model

import type { SelectionCreateType } from "@/types";
import type { Selection } from "../../types/viewer";
import { UISelectionStage, type UISelection } from "../../types/selection-lifecycle";

export function fromApiSelection(sel: Selection): UISelection {
  const state = (sel as any).state as string | undefined;
  const stage =
    state === "staged_edition"
      ? UISelectionStage.StagedEdition
      : state === "staged_deletion"
      ? UISelectionStage.StagedDeletion
      : state === "staged_creation"
      ? UISelectionStage.StagedCreation
      : UISelectionStage.Committed;

  return {
    ...(sel as any),
    stage,
    isPersisted: true,
    dirty: false,
  } as UISelection;
}

export function toApiCreate(sel: UISelection): SelectionCreateType {
  // Assume caller ensures sel.isPersisted === false
  // We let server decide final state; include known fields for create
  const { id: _id, dirty: _dirty, dirtyFields: _df, isPersisted: _p, stage: _st, ...rest } = sel as any;
  return rest as SelectionCreateType;
}

export function toApiUpdate(sel: UISelection): Partial<Selection> {
  // Only include fields likely relevant to an update
  // For now, include stage as mapped to API state; refine with dirtyFields in later PRs
  const state =
    sel.stage === UISelectionStage.StagedEdition
      ? "staged_edition"
      : sel.stage === UISelectionStage.StagedDeletion
      ? "staged_deletion"
      : sel.stage === UISelectionStage.StagedCreation
      ? "staged_creation"
      : "committed";

  return { state } as Partial<Selection>;
}

export function mergeServerResponse(sel: UISelection, apiSel: Selection): UISelection {
  const merged = { ...sel, ...(apiSel as any) } as UISelection;
  const state = (merged as any).state as string | undefined;
  merged.stage =
    state === "staged_edition"
      ? UISelectionStage.StagedEdition
      : state === "staged_deletion"
      ? UISelectionStage.StagedDeletion
      : state === "staged_creation"
      ? UISelectionStage.StagedCreation
      : UISelectionStage.Committed;
  merged.isPersisted = true;
  merged.dirty = false;
  return merged;
}

