import { UnifiedViewerProvider } from "./core/ViewerState";
import { SelectionProvider } from "./core/SelectionProvider";
import Renderer from "./Layers";
import Controller from "./Controls";
import { WidgetContainer, Widget, WidgetBody } from "@/components/shared/Widget";
import { type MinimalDocumentType } from "@/types";
import { useSelectionsIntegration } from "./hooks/useSelectionsIntegration";
import { useViewerState } from "./hooks/useViewerState";

type DocumentViewerProps = {
  document: MinimalDocumentType;
};

// Bridge component that provides selections from old system to new SelectionProvider
function SelectionProviderBridge({ document }: { document: MinimalDocumentType }) {
  const { existingSelections, newSelections } = useViewerState();
  
  // Convert old selection format to new format for the SelectionProvider
  const initialSelections = {
    saved: existingSelections,
    new: newSelections.map(sel => ({ ...sel, id: sel.id || `temp_${Date.now()}_${Math.random()}` }))
  };
  
  return (
    <SelectionProvider initialSelections={initialSelections}>
      <ViewerContent document={document} />
    </SelectionProvider>
  );
}

// Internal component that uses selections integration hook within the provider
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

// Main component that integrates selections within the UnifiedViewerProvider
function ViewerWithSelections({ document }: { document: MinimalDocumentType }) {
  // This hook connects the fetched selections to the ViewerState
  useSelectionsIntegration(document.id);

  return <SelectionProviderBridge document={document} />;
}

export default function DocumentViewer({ document }: DocumentViewerProps) {
  if (!document) {
    return <div>Document not found</div>;
  }

  return (
    <UnifiedViewerProvider document={document}>
      <ViewerWithSelections document={document} />
    </UnifiedViewerProvider>
  );
}
