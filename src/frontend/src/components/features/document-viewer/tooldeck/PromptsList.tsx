import { Button } from "@/components/ui/button";
import { Save, X, Loader2 } from "lucide-react";
import { useDocumentPrompts } from "@/hooks/useDocumentData";

type Props = { documentId: string };

export default function PromptList({ documentId }: Props) {
  const { prompts, loading, error } = useDocumentPrompts(documentId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-xs text-muted-foreground">Loading prompts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-destructive p-3 border border-destructive/20 bg-destructive/5 rounded-md">
        {error}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <Save className="h-3 w-3 mr-1" /> 
          Save All
        </Button>
        <Button variant="destructive" size="sm" className="h-8 text-xs">
          Clear All
        </Button>
      </div>
      
      {/* Prompts List */}
      <div className="space-y-2">
        {prompts.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-md">
            No prompts configured
          </div>
        ) : (
          prompts.map(prompt => (
            <div key={prompt.id} className="group">
              <div className="flex items-center w-full p-2 hover:bg-muted/50 rounded-md border border-border/50">
                <span className="text-xs flex-1 min-w-0 truncate">
                  {prompt.text}
                </span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 w-6 p-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
