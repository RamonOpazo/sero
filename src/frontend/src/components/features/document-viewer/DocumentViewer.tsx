import { DocumentViewerProvider } from "@/context/DocumentViewerContext";
import { PDFProvider } from "@/context/PDFContext";
import Renderer from "./renderer/Renderer";
import Controller from "./controller/Controller";
import { WidgetContainer, Widget, WidgetBody } from "@/components/atomic/Widget";
import { type DocumentType } from "@/types";

type DocumentViewerProps = {
  document: DocumentType;
};

export default function DocumentViewer({ document }: DocumentViewerProps) {

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
