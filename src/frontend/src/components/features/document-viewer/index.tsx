import { ViewportProvider } from "./providers";
import { PromptProvider } from "./providers";
import { SelectionProvider } from "./core/selection-provider";
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

  return (
    <ViewportProvider document={document}>
      <SelectionProvider documentId={document.id}>
        <PromptProvider documentId={document.id}>
          <DocumentViewerContent document={document} />
        </PromptProvider>
      </SelectionProvider>
    </ViewportProvider>
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

// Domain Managers (configuration-driven system)
export { 
  createPromptManager, 
  createSelectionManager,
  type PromptManagerInstance,
  type SelectionManagerInstance
} from './managers';

// Utilities
export * from "./utils";

// Custom hooks
export * from "./hooks";

// Types
export * from "./types";
