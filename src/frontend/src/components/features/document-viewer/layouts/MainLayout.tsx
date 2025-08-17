import { type MinimalDocumentType } from "@/types";
import { WidgetContainer, Widget, WidgetContent } from "@/components/shared/Widget";
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
        <WidgetContent expanded className="p-0">
          <ViewportLayout document={document} />
        </WidgetContent>
      </Widget>

      {/* Controls sidebar */}
      <ControlsLayout document={document} className="max-w-(--sidebar-width)"/>
    </WidgetContainer>
  );
}
