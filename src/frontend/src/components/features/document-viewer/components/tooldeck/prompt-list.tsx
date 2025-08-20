import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Loader2, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrompts } from "../../providers/prompt-provider";
import { toast } from "sonner";
import { useMemo } from "react";
import type { PromptType, PromptCreateType } from "@/types";

type Prompt = PromptType | (PromptCreateType & { id: string });

type Props = { 
  documentId: string;
  onEditPrompt?: (promptId: string) => void;
};

export default function PromptList({ onEditPrompt }: Props) {
  const {
    state: { savedItems: savedPrompts, newItems: newPrompts, isLoading, isDeleting, error, initialState },
    deletePromptLocally
  } = usePrompts();

  const handleDeletePrompt = (promptId: string) => {
    const success = deletePromptLocally(promptId);
    if (success) {
      toast.success('Prompt deleted (not yet saved)');
    } else {
      toast.error('Failed to delete prompt');
    }
  };

  // Enhanced prompts with type information and modification status
  const promptsWithTypeInfo = useMemo(() => {
    const initialSavedPrompts = initialState.savedItems;

    const saved = savedPrompts.map((prompt: Prompt) => {
      // Check if this saved prompt was modified from its initial state
      const initialPrompt = initialSavedPrompts?.find((initial: Prompt) => initial.id === prompt.id);
      const isModified = initialPrompt && (
        prompt.text !== initialPrompt.text ||
        prompt.temperature !== initialPrompt.temperature ||
        JSON.stringify(prompt.languages) !== JSON.stringify(initialPrompt.languages)
      );

      return {
        ...prompt,
        type: 'saved' as const,
        isModified: !!isModified,
      };
    });

    const newOnes = newPrompts.map((prompt: Prompt) => ({
      ...prompt,
      type: 'new' as const,
      isModified: false,
    }));

    return [...newOnes, ...saved]; // New prompts first
  }, [savedPrompts, newPrompts, initialState.savedItems]);

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

  // Helper functions to parse and format prompt data
  const parsePromptText = (text: string) => {
    const lines = text.split('\n');
    let ruleType = 'General';
    let priority = 'medium';
    let title = 'AI Rule';
    let instructions = text;

    // Parse structured prompt text
    lines.forEach((line, index) => {
      if (line.startsWith('Rule Type: ')) {
        ruleType = line.replace('Rule Type: ', '').trim();
      } else if (line.startsWith('Priority: ')) {
        priority = line.replace('Priority: ', '').toLowerCase().trim();
      } else if (line.startsWith('Title: ')) {
        title = line.replace('Title: ', '').trim();
      } else if (line.startsWith('Instructions:')) {
        instructions = lines.slice(index + 1).join('\n').trim();
      }
    });

    return { ruleType, priority, title, instructions };
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'Critical';
      case 'medium': return 'Important';
      case 'low': return 'Helpful';
      default: return 'Standard';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getTypeLabel = (ruleType: string) => {
    // Match the exact labels from AddPromptDialog RULE_TYPES
    const type = ruleType.toLowerCase();
    if (type.includes('identify-and-mark') || type.includes('identify and mark')) return 'Identify';
    if (type.includes('redact-content') || type.includes('redact content')) return 'Redact';
    if (type.includes('preserve-content') || type.includes('preserve content')) return 'Preserve';
    if (type.includes('exclude-content') || type.includes('exclude content')) return 'Exclude';
    if (type.includes('custom')) return 'Custom Rule';
    return 'Custom Rule';
  };

  const getTypeColor = (ruleType: string) => {
    const type = ruleType.toLowerCase();
    if (type.includes('identify-and-mark') || type.includes('identify and mark')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    if (type.includes('redact-content') || type.includes('redact content')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    if (type.includes('preserve-content') || type.includes('preserve content')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    if (type.includes('exclude-content') || type.includes('exclude content')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    if (type.includes('custom')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  if (promptsWithTypeInfo.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-md">
        <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <div>No AI rules yet</div>
        <div className="text-xs opacity-70 mt-1">Click "Add Rule" to create your first AI processing rule</div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-80 hide-scrollbar w-full">
      <div className="space-y-1 w-full max-w-full">
        {promptsWithTypeInfo.map((prompt) => {
          const { ruleType, priority, title, instructions } = parsePromptText(prompt.text);
          const isNew = prompt.type === 'new';
          const isModified = prompt.isModified;

          // Determine status indicator
          const getStatusIndicator = () => {
            if (isNew) {
              return {
                color: "bg-green-500",
                title: "New AI rule",
                label: "New"
              };
            } else if (isModified) {
              return {
                color: "bg-amber-500",
                title: "Modified AI rule",
                label: "Modified"
              };
            } else {
              return {
                color: "bg-gray-400",
                title: "Saved AI rule",
                label: "Saved"
              };
            }
          };

          const statusIndicator = getStatusIndicator();

          return (
            <div
              key={prompt.id}
              className={cn(
                "group pr-3 py-3 text-xs cursor-pointer focus:outline-none focus:ring-0",
                "border-l-2 border-transparent pl-0 shadow-none",
                "transition-all duration-200",
                "hover:border-l-muted-foreground/30 hover:pl-3 hover:bg-muted/10",
                "focus:border-l-primary/50 focus:pl-3 focus:bg-muted/20 focus:shadow-sm",
                "rounded-r-md",
                "flex flex-col w-full min-w-0"
              )}
              tabIndex={0}
              onClick={() => onEditPrompt?.(prompt.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onEditPrompt?.(prompt.id);
                }
              }}
            >
              {/* Line 1: Title and delete button */}
              <div className="grid grid-cols-[1fr_auto] gap-2 items-center mb-2">
                <div className="font-medium text-foreground text-sm leading-tight truncate">
                  {title}
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

              {/* Line 2: Edit status */}
              <div className="flex flex-row items-center gap-1 flex-shrink-0 mb-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", statusIndicator.color)} title={statusIndicator.title} />
                <span className="text-muted-foreground text-xs">{statusIndicator.label}</span>
              </div>

              {/* Line 3: Badges and status */}
              <div className="flex flex-row flex-wrap items-center gap-2 mb-2 min-w-0">
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium flex-shrink-0",
                  getPriorityColor(priority)
                )}>
                  {getPriorityLabel(priority)}
                </span>

                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium flex-shrink-0",
                  getTypeColor(ruleType)
                )}>
                  {getTypeLabel(ruleType)}
                </span>
              </div>

              {/* Line 4: Instructions preview */}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground/60 line-clamp-2 break-words overflow-hidden">
                  {instructions || prompt.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
