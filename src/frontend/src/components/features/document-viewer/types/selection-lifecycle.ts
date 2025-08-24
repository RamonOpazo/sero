// Selection lifecycle types for the new state machine

import type { Selection } from "../types/viewer";

// Explicit lifecycle stages that drive all UI and behavior
export enum UISelectionStage {
  Unstaged = "unstaged",
  StagedCreation = "staged_creation",
  StagedEdition = "staged_edition",
  StagedDeletion = "staged_deletion",
  Committed = "committed",
}

// Unified UI selection with lifecycle metadata
export type UISelection = Selection & {
  stage: UISelectionStage;
  isPersisted: boolean;
  dirty: boolean;
  dirtyFields?: ReadonlySet<string>;
};

