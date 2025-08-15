import { type MinimalDocumentType } from "@/types";
import { WidgetContainer, Widget, WidgetBody } from "@/components/shared/Widget";
import ViewportLayout from "./ViewportLayout";
import ControlsLayout from "./TooldeckLayout";

interface DocumentViewerLayoutProps {
  document: MinimalDocumentType;
}

/**
 * Main layout component for the document viewer
 * Organizes the renderer and controls in a two-column layout
 */
export default function DocumentViewerLayout({ document }: DocumentViewerLayoutProps) {
  return (
    <WidgetContainer expanded className="flex-row">
      {/* Main renderer area */}
      <Widget expanded orthocentered className="relative p-0">
        <WidgetBody expanded className="p-0">
          <ViewportLayout document={document} />
        </WidgetBody>
      </Widget>
      
      {/* Controls sidebar */}
      <Widget expanded className="max-w-(--sidebar-width)">
        <WidgetBody expanded>
          <ControlsLayout document={document} />
        </WidgetBody>
      </Widget>
    </WidgetContainer>
  );
}
