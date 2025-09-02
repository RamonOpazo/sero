import { DocumentViewerProvider } from "./providers";
import { ViewportLayout } from "./viewport";
import { type MinimalDocumentType } from "@/types";

type DocumentViewerProps = {
  document: MinimalDocumentType;
};

// Internal component that loads selections and renders the layout
function DocumentViewerContent({ document }: { document: MinimalDocumentType }) {
  // SelectionProvider now loads selections on mount (no explicit loader hook needed)
  return <ViewportLayout document={document} />;
}

/**
 * Main DocumentViewer component with clean architecture
 * 
 * Provides all necessary context providers:
 * - ViewportProvider: viewport state (zoom, pan, navigation)
 * - SelectionProvider: selection management
 * - PromptProvider: prompt management
 */
export default function DocumentViewer({ document }: DocumentViewerProps) {
  if (!document) {
    return <div>Document not found</div>;
  }

  // Log entry into DocumentViewer with a compact summary
  const filesSummary = (document.files || []).map((f: any) => ({ id: f.id, type: f.file_type, hasBlob: !!(f as any).blob }));
  // Use info level to make it visible
  console.info('[DocumentViewer] Mount', {
    docId: document.id,
    hasOriginalPtr: !!document.original_file,
    hasRedactedPtr: !!document.redacted_file,
    files: filesSummary,
  });

  return (
    <DocumentViewerProvider document={document}>
      <DocumentViewerContent document={document} />
    </DocumentViewerProvider>
  );
}

// Export main component with named export for flexibility
export { DocumentViewer };

// =============================================================================
// RE-EXPORTS FOR PUBLIC API
// =============================================================================

// Providers and state management
export * from "./providers";

// Utilities
export * from "./utils";

// Custom hooks
export * from "./hooks";

// Types
export * from "./types";
