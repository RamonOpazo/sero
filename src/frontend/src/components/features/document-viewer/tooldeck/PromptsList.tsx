import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrompts } from "../core/PromptProvider";
import { toast } from "sonner";

type Props = { documentId: string };

export default function PromptList({ documentId }: Props) {
  const {
    state: { prompts, isLoading, isDeleting, error },
    deletePrompt
  } = usePrompts();
  
  const handleDeletePrompt = async (promptId: string) => {
    try {
      const result = await deletePrompt(promptId);
      if (result.success) {
        toast.success('Prompt deleted successfully');
      } else {
        toast.error('Failed to delete prompt');
      }
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error('Failed to delete prompt');
    }
  };

  if (isLoading) {
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

  if (prompts.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-md">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <div>No prompts yet</div>
        <div className="text-xs opacity-70 mt-1">Click "Add new prompt" to get started</div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-80 hide-scrollbar">
      <div>
        {prompts.map((prompt) => (
          <div
            key={prompt.id}
            className={cn(
              "group pr-4 py-3 text-xs cursor-pointer focus:outline-none focus:ring-0",
              "border-l-2 border-transparent pl-0 shadow-none",
              "transition-all duration-200",
              "hover:border-l-muted-foreground/30 hover:pl-4 hover:bg-muted/10",
              "focus:border-l-primary/50 focus:pl-4 focus:bg-muted/20 focus:shadow-sm"
            )}
            tabIndex={0}
          >
            {/* Top row: Title and delete button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="AI Prompt" />
                <span className="text-muted-foreground text-xs font-medium truncate">
                  AI Processing Rule
                </span>
              </div>
              
              {/* Delete button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePrompt(prompt.id);
                }}
                disabled={isDeleting === prompt.id}
                className="h-6 w-6 p-0 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
              >
                {isDeleting === prompt.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </Button>
            </div>
            
            {/* Bottom row: Prompt text preview */}
            <div className="text-xs text-muted-foreground/60 mt-1.5 line-clamp-2">
              {prompt.text}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
