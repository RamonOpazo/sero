import { UnifiedDocumentViewerProvider } from "./providers";
import DocumentViewerLayout from "./components/layouts/main-layout";
import { type MinimalDocumentType } from "@/types";
import { useSelectionLoader } from "./hooks/useSelectionLoader";

type DocumentViewerProps = {
  document: MinimalDocumentType;
};

// Internal component that loads selections and renders the layout
function DocumentViewerContent({ document }: { document: MinimalDocumentType }) {
  // Load selections from API directly into SelectionManager system
  useSelectionLoader(document.id);
  
  return <DocumentViewerLayout document={document} />;
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
    <UnifiedDocumentViewerProvider document={document}>
      <DocumentViewerContent document={document} />
    </UnifiedDocumentViewerProvider>
  );
}

// Export main component with named export for flexibility
export { DocumentViewer };

// =============================================================================
// RE-EXPORTS FOR PUBLIC API
// =============================================================================

// Components (organized by category)
export * from "./components";

// Providers and state management
export * from "./providers";

// Utilities
export * from "./utils";

// Custom hooks
export * from "./hooks";

// Types
export * from "./types";
