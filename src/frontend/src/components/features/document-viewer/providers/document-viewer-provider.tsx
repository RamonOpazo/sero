import type { PropsWithChildren } from 'react';
import type { MinimalDocumentType } from '@/types';
import { ViewportProvider } from './viewport-provider';
import { SelectionsProvider } from './selections-provider';
import { PromptsProvider } from './prompts-provider';

export type DocumentViewerProviderProps = PropsWithChildren<{
  document: MinimalDocumentType;
}>;

/**
 * UnifiedDocumentViewerProvider
 *
 * Convenience wrapper that composes the three document-viewer providers in the
 * correct order while keeping their contexts separate for performance.
 *
 * Order:
 * - ViewportProvider (needs full document)
 * - SelectionProvider (needs documentId; may read viewport state)
 * - PromptProvider (needs documentId)
 */
export function DocumentViewerProvider({
  document,
  children,
}: DocumentViewerProviderProps) {
  // Provider boundary log
  console.info('[UnifiedDocumentViewerProvider] Mount', {
    docId: document.id,
    originalPtr: !!document.original_file,
    redactedPtr: !!document.redacted_file,
  });
  return (
    <ViewportProvider document={document}>
      <SelectionsProvider documentId={document.id}>
        <PromptsProvider documentId={document.id}>{children}</PromptsProvider>
      </SelectionsProvider>
    </ViewportProvider>
  );
}

