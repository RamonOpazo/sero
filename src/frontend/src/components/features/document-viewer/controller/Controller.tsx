import { cn } from "@/lib/utils"
import SelectionList from "./SelectionsList";
import PromptList from "./PromptsList";
import ControllerButtons from "./ControllerButtons";
import type { DocumentType } from "@/types";

type Props = { document: DocumentType };

export default function Controller({ document, className, ...props }: Props & React.ComponentProps<"div">) {
  return (
    <div
      data-slot="document-viewer-controller"
      className={cn(
        "flex flex-1 flex-col gap-2 relative h-full w-full overflow-hidden",
        className
      )} {...props}
    >
      <ControllerButtons />
      <SelectionList selections={document.selections} />
      <PromptList prompts={document.prompts} />
    </div>
  );
}
