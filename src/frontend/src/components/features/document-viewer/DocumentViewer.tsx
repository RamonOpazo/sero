import { DocumentViewerProvider } from "@/context/DocumentViewerContext";
import { PDFProvider } from "@/context/PDFContext";
import Renderer from "./renderer/Renderer";
import Controller from "./controller/Controller";
import { WidgetContainer, Widget, WidgetContent } from "@/components/atomic/Widget";
import { type Document } from "@/types";

type DocumentViewerProps = {
  document: Document;
};

export default function DocumentViewer({ document }: DocumentViewerProps) {

  return (
    <DocumentViewerProvider>
      <PDFProvider>
        <WidgetContainer>
          <Widget expanded className="relative items-center">
            <WidgetContent className="h-full max-h-full items-center">
              <Renderer document={document} />
            </WidgetContent>
          </Widget>
          <Widget>
            <WidgetContent className="w-(--sidebar-width)">
              <Controller document={document} />
            </WidgetContent>
          </Widget>
        </WidgetContainer>
      </PDFProvider>
    </DocumentViewerProvider>
  );
}
