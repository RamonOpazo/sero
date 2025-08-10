import { DocumentViewerProvider } from "@/context/DocumentViewerContext";
import { PDFProvider } from "@/context/PDFContext";
import Renderer from "./Layers";
import Controller from "./Controls";
import { WidgetContainer, Widget, WidgetBody } from "@/components/shared/Widget";
import { type DocumentType } from "@/types";

type DocumentViewerProps = {
  document: DocumentType;
};

export default function DocumentViewer({ document }: DocumentViewerProps) {
  if (!document) {
    return <div>Document not found</div>;
  }

  return (
    <DocumentViewerProvider>
      <PDFProvider>
        <WidgetContainer expanded className="flex-row">
          <Widget expanded orthocentered className="relative">
            <WidgetBody expanded>
              <Renderer document={document} />
            </WidgetBody>
          </Widget>
          <Widget expanded className="max-w-(--sidebar-width)">
            <WidgetBody expanded>
              <Controller document={document} />
            </WidgetBody>
          </Widget>
        </WidgetContainer>
      </PDFProvider>
    </DocumentViewerProvider>
  );
}
