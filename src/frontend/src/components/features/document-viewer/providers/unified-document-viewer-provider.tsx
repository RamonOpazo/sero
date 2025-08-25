import type { PropsWithChildren } from 'react';
import type { MinimalDocumentType } from '@/types';
import { ViewportProvider } from './viewport-provider';
import { SelectionProvider } from './selection-provider';
import { PromptProvider } from './prompt-provider';

export type UnifiedDocumentViewerProviderProps = PropsWithChildren<{
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
export function UnifiedDocumentViewerProvider({
  document,
  children,
}: UnifiedDocumentViewerProviderProps) {
  // Provider boundary log
  console.info('[UnifiedDocumentViewerProvider] Mount', {
    docId: document.id,
    originalPtr: !!document.original_file,
    redactedPtr: !!document.redacted_file,
  });
  return (
    <ViewportProvider document={document}>
      <SelectionProvider documentId={document.id}>
        <PromptProvider documentId={document.id}>{children}</PromptProvider>
      </SelectionProvider>
    </ViewportProvider>
  );
}

