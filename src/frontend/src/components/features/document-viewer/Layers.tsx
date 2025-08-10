import { cn } from "@/lib/utils"
import DocumentLayer from "./RenderLayer";
import SelectionsLayer from "./SelectionsLayer";
import InfoLayer from "./InfoLayer";
import ActionsLayer from "./ActionsLayer";
import type { DocumentType } from "@/types";

type Props = { document: DocumentType };

export default function Renderer({ document, className, ...props }: Props & React.ComponentProps<"div">) {
  return (
    <div
    data-slot="document-viewer-renderer"
    className={cn(
      "flex flex-1 relative h-full w-full justify-center items-center overflow-hidden",
      className
    )} {...props}
  >
      <DocumentLayer document={document} />
      <SelectionsLayer document={document} />
      <InfoLayer document={document} />
      <ActionsLayer />
    </div>
  );
}
