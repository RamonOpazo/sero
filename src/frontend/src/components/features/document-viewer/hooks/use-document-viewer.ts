import { useViewportState, useViewportActions } from "../providers/viewport-provider";
import { useSelections } from "../providers/selection-provider";
import { usePrompts } from "../providers/prompt-provider";
import type { MinimalDocumentType } from "@/types";
import { useActions } from "./use-actions";

// Canonical composed hook (alias of previous useViewer)
export function useDocumentViewer(document?: MinimalDocumentType) {
  const viewportState = useViewportState();
  const viewportActions = useViewportActions();
  const selections = useSelections();
  const prompts = usePrompts();
  const actions = document ? useActions(document) : null;

  return {
    viewport: { ...viewportState, ...viewportActions },
    selections,
    prompts,
    actions,
  } as const;
}

