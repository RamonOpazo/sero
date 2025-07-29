import SelectionList from "./SelectionsList";
import PromptList from "./PromptsList";
import ControllerButtons from "./ControllerButtons";
import { type Document } from "@/types";

export default function Controller({ document }: { document: Document }) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* {document && ( */}
        <>
          <ControllerButtons />
          <SelectionList selections={document.selections} />
          <PromptList prompts={document.prompts} />
        </>
      {/* )} */}
    </div>
  );
}
