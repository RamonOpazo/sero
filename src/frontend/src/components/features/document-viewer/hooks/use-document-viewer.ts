import { useViewportState, useViewportActions } from "../providers/viewport-provider";
import { useSelections } from "../providers/selections-provider";
import { usePrompts } from "../providers/prompts-provider";

/**
 * Composed hook for document viewer state (no cross-domain commands)
 */
export function useDocumentViewer() {
  const viewportState = useViewportState();
  const viewportActions = useViewportActions();
  const selections = useSelections();
  const prompts = usePrompts();

  return {
    viewport: { ...viewportState, ...viewportActions },
    selections,
    prompts,
  } as const;
}

