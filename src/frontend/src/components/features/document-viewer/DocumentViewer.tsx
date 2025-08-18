import { ViewportProvider } from "./core/ViewportState";
import { SelectionProvider } from "./core/SelectionProvider";
import { PromptProvider } from "./core/PromptProvider";
import DocumentViewerLayout from "./layouts/MainLayout";
import { type MinimalDocumentType } from "@/types";
import { useSelectionLoader } from "./hooks/useSelectionLoader";

type DocumentViewerProps = {
  document: MinimalDocumentType;
};

// Clean component that loads selections directly into new system
function ViewerWithNewSystem({ document }: { document: MinimalDocumentType }) {
  // Load selections from API directly into new SelectionManager system
  useSelectionLoader(document.id);
  
  return <DocumentViewerLayout document={document} />;
}

// Main component with clean architecture - includes both Selection and Prompt managers
function ViewerWithCleanArchitecture({ document }: { document: MinimalDocumentType }) {
  return (
    <SelectionProvider documentId={document.id}>
      <PromptProvider documentId={document.id}>
        <ViewerWithNewSystem document={document} />
      </PromptProvider>
    </SelectionProvider>
  );
}

export default function DocumentViewer({ document }: DocumentViewerProps) {
  if (!document) {
    return <div>Document not found</div>;
  }

  return (
    <ViewportProvider document={document}>
      <ViewerWithCleanArchitecture document={document} />
    </ViewportProvider>
  );
}
