import { type PromptType } from "@/types";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";

type Props = { prompts: PromptType[] };

export default function PromptList({ prompts }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md text-xs font-medium">Prompts</h4>
      <div className="grid grid-cols-2 justify-between items-center gap-2">
        <Button variant="outline" size="sm">
          <Save /> Save
        </Button>
        <Button variant="destructive" size="sm">
          Clear All
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {prompts.map(prompt => (
          <div key={prompt.id} className="flex flex-col gap-1.5 justify-between items-center">
            <div className="flex flex-row w-full hover:bg-muted/50 rounded-md justify-start items-center border">
              <span className="text-xs text-sidebar-foreground/70 pl-2">
                {prompt.text}
              </span>
              <Button size="icon" variant="ghost" className="ml-auto"><X size={5} /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
