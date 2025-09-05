// Selection lifecycle types for the new state machine

import type { Selection, Prompt } from "./viewer";

// Explicit lifecycle stages that drive all UI and behavior
export const UILifecycleStage = {
  Unstaged: "unstaged",
  StagedCreation: "staged_creation",
  StagedEdition: "staged_edition",
  StagedDeletion: "staged_deletion",
  Committed: "committed",
} as const;

export type UILifecycleStage = typeof UILifecycleStage[keyof typeof UILifecycleStage];

// Unified UI selection with lifecycle metadata
export type UISelectionLifecycle = Selection & {
  stage: UILifecycleStage;
  isSaved: boolean;
  isDirty: boolean;
  dirtyFields?: ReadonlySet<string>;
};

export type UIPromptLifecycle = Prompt & {
  stage: UILifecycleStage;
  isSaved: boolean;
  isDirty: boolean;
  dirtyFields?: ReadonlySet<string>;
};