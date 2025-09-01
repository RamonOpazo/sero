import { useViewportState, useViewportActions } from "../providers/viewport-provider";
import { useSelections } from "../providers/selection-provider";
import { usePrompts } from "../providers/prompt-provider";
import type { MinimalDocumentType } from "@/types";
import { useActions } from "./use-actions";

/**
 * Composed convenience hook for common consumers inside Document Viewer
 *
 * Returns a stable shape grouping viewport, selections, prompts, and optional actions.
 */
export function useViewer(document?: MinimalDocumentType) {
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

