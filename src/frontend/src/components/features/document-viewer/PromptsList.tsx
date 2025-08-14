import { Button } from "@/components/ui/button";
import { Save, X, Loader2 } from "lucide-react";
import { useDocumentPrompts } from "@/hooks/useDocumentData";

type Props = { documentId: string };

export default function PromptList({ documentId }: Props) {
  const { prompts, loading, error } = useDocumentPrompts(documentId);

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <h4 className="text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md text-xs font-medium">Prompts</h4>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="ml-2 text-xs text-muted-foreground">Loading prompts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <h4 className="text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md text-xs font-medium">Prompts</h4>
        <div className="text-xs text-destructive p-2 border border-destructive rounded-md">
          {error}
        </div>
      </div>
    );
  }
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
