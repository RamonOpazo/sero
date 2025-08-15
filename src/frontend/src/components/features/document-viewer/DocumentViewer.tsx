import { UnifiedViewerProvider } from "./core/ViewerState";
import { SelectionProvider } from "./core/SelectionProvider";
import Renderer from "./Layers";
import Controller from "./Controls";
import { WidgetContainer, Widget, WidgetBody } from "@/components/shared/Widget";
import { type MinimalDocumentType } from "@/types";
import { useSelectionLoader } from "./hooks/useSelectionLoader";

type DocumentViewerProps = {
  document: MinimalDocumentType;
};

// Clean component that loads selections directly into new system
function ViewerWithNewSystem({ document }: { document: MinimalDocumentType }) {
  // Load selections from API directly into new SelectionManager system
  useSelectionLoader(document.id);
  
  return <ViewerContent document={document} />;
}

// Clean content component - no selection logic mixed in
function ViewerContent({ document }: { document: MinimalDocumentType }) {
  return (
    <WidgetContainer expanded className="flex-row">
      <Widget expanded orthocentered className="relative p-0">
        <WidgetBody expanded className="p-0">
          <Renderer document={document} />
        </WidgetBody>
      </Widget>
      <Widget expanded className="max-w-(--sidebar-width)">
        <WidgetBody expanded>
          <Controller document={document} />
        </WidgetBody>
      </Widget>
    </WidgetContainer>
  );
}

// Main component with clean architecture - old system removed from selection logic
function ViewerWithCleanArchitecture({ document }: { document: MinimalDocumentType }) {
  return (
    <SelectionProvider>
      <ViewerWithNewSystem document={document} />
    </SelectionProvider>
  );
}

export default function DocumentViewer({ document }: DocumentViewerProps) {
  if (!document) {
    return <div>Document not found</div>;
  }

  return (
    <UnifiedViewerProvider document={document}>
      <ViewerWithCleanArchitecture document={document} />
    </UnifiedViewerProvider>
  );
}
