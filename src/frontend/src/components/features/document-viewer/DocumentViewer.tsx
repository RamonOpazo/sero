import { UnifiedViewerProvider } from "./core/ViewerState";
import Renderer from "./Layers";
import Controller from "./Controls";
import { WidgetContainer, Widget, WidgetBody } from "@/components/shared/Widget";
import { type MinimalDocumentType } from "@/types";
import { useSelectionsIntegration } from "./hooks/useSelectionsIntegration";

type DocumentViewerProps = {
  document: MinimalDocumentType;
};

// Internal component that uses selections integration hook within the provider
function ViewerWithSelections({ document }: { document: MinimalDocumentType }) {
  // This hook connects the fetched selections to the ViewerState
  useSelectionsIntegration(document.id);

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
