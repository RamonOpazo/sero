import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Bot, MoreVertical, Settings, Trash2, GitCommitVertical, GitPullRequestCreateArrow, Search, EyeOff, Bookmark, Ban, Wand2, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrompts } from "../providers/prompts-provider";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import type { PromptType, PromptCreateType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FormConfirmationDialog } from "@/components/shared";

type Prompt = PromptType | (PromptCreateType & { id: string });

type Props = { 
  documentId: string,
  onEditPrompt?: (promptId: string) => void,
};

export default function PromptListing({ onEditPrompt }: Props) {
  const {
    state,
    deletePrompt,
    pendingChanges,
    updatePrompt,
    save,
  } = usePrompts();

  const savedPrompts = (state as any).persistedItems || [];
  const newPrompts = (state as any).draftItems || [];
  const isLoading = (state as any).isLoading || false;
  const error = (state as any).error || null;

  const handleDeletePrompt = (promptId: string) => {
    deletePrompt(promptId);
    toast.success('Prompt deleted (not yet saved)');
  };

  // Enhanced prompts with type information and modification status
  const promptsWithTypeInfo = useMemo(() => {
    const updatedIds = new Set(pendingChanges.updates.map((p: any) => p.id));

    const saved = savedPrompts.map((prompt: Prompt) => ({
      ...prompt,
      type: 'saved' as const,
      isModified: updatedIds.has(prompt.id),
    }));

    const newOnes = newPrompts.map((prompt: Prompt) => ({
      ...prompt,
      type: 'new' as const,
      isModified: false,
    }));

    return [...newOnes, ...saved]; // New prompts first
  }, [savedPrompts, newPrompts, pendingChanges.updates]);

  // Local edit dialog state (must be declared before any early returns to keep hooks order stable)
  const [editDialog, setEditDialog] = useState<{ open: boolean; promptId: string | null }>({
    open: false,
    promptId: null,
  });

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
    let title = '';
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

  const getPriorityStatus = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'error' as const;
      case 'medium': return 'warning' as const;
      case 'low': return 'success' as const;
      default: return undefined;
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

  if (promptsWithTypeInfo.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-md">
        <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <div>No AI rules yet</div>
        <div className="text-xs opacity-70 mt-1">Click \"Add Rule\" to create your first AI processing rule</div>
      </div>
    );
  }


  const openEdit = (id: string) => {
    if (onEditPrompt) {
      onEditPrompt(id);
      return;
    }
    setEditDialog({ open: true, promptId: id });
  };

  const findPromptById = (id: string | null): Prompt | undefined => {
    if (!id) return undefined;
    const all: Prompt[] = [...(newPrompts as Prompt[]), ...(savedPrompts as Prompt[])];
    return all.find((p) => p.id === id);
  };

  return (
    <>
      <ScrollArea className="h-80 hide-scrollbar w-full">
        <div className="space-y-1 w-full max-w-full">
        {promptsWithTypeInfo.map((prompt) => {
          const { ruleType, priority, title, instructions } = parsePromptText(prompt.prompt || '');
          const isNew = prompt.type === 'new';
          const isModified = prompt.isModified;

          // Compute display title: prefer explicit field, then parsed, then snippet
          const displayTitle = (prompt as any).title?.trim() || title.trim() || (instructions.split('\n')[0]?.slice(0, 80) || 'Untitled');

          // Status indicator styling similar to SelectionList
          const statusIndicator = (() => {
            if (isNew) return { color: 'text-emerald-500', title: 'New AI rule', label: 'New' } as const;
            if (isModified) return { color: 'text-amber-500', title: 'Modified AI rule', label: 'Modified' } as const;
            return { color: 'text-gray-400', title: 'Saved AI rule', label: 'Saved' } as const;
          })();

          const StatusIcon = statusIndicator.label.toLowerCase() === 'saved' ? GitCommitVertical : GitPullRequestCreateArrow;
          const typeLabel = getTypeLabel(ruleType);
          const TypeIcon = (() => {
            switch (typeLabel) {
              case 'Identify': return Search;
              case 'Redact': return EyeOff;
              case 'Preserve': return Bookmark;
              case 'Exclude': return Ban;
              default: return Wand2;
            }
          })();
          const priorityStatus = getPriorityStatus(priority);
          const PriorityIcon = (() => {
            switch (priorityStatus) {
              case 'error': return AlertTriangle;
              case 'warning': return AlertCircle;
              case 'success': return Info;
              default: return Info;
            }
          })();

          return (
            <div
              key={prompt.id}
              className={cn(
                'relative',
                'group p-2 text-xs cursor-pointer focus:outline-none focus:ring-0',
                'border-l-2 border-transparent',
                'bg-muted/30',
                'transition-all duration-200',
                'hover:border-l-muted-foreground/30 hover:pl-3 hover:bg-muted/30',
                'focus:border-l-primary/50 focus:pl-3 focus:bg-muted/70',
                'rounded-r-md',
                'flex flex-col w-full min-w-0',
              )}
              tabIndex={0}
              onClick={() => openEdit(prompt.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onEditPrompt?.(prompt.id);
                }
              }}
            >
              {/* Row actions menu (top-right) */}
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:text-foreground hover:bg-muted/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                      title="Row actions"
                      aria-label="Row actions"
                    >
                      <MoreVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={4}>
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); openEdit(prompt.id); }}
                    >
                      <Settings /> Edit rule
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDeletePrompt(prompt.id); }}
                    >
                      <Trash2 /> Delete rule
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-col py-2">
                <div className="mb-2 pr-8">
                  <div className="text-sm font-medium leading-tight truncate">{displayTitle}</div>
                  <div className="text-xs text-muted-foreground/70 line-clamp-2 break-words overflow-hidden">
                    {instructions || (prompt as any).text}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2  [&>*]:w-full [&>*]:justify-start">
                  <Badge
                    title={statusIndicator.title}
                    variant="outline"
                    icon={StatusIcon}
                    status="custom"
                    customStatusColor={statusIndicator.color}
                  >{statusIndicator.label}</Badge>

                  <Badge
                    title="Rule type"
                    variant="outline"
                    icon={TypeIcon}
                  >{typeLabel}</Badge>

                  <Badge
                    title="Priority"
                    variant="outline"
                    icon={PriorityIcon}
                    status={priorityStatus}
                  >{getPriorityLabel(priority)}</Badge>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </ScrollArea>

      {/* Inline Edit Rule Dialog */}
      <FormConfirmationDialog
        isOpen={editDialog.open}
        onClose={() => setEditDialog({ open: false, promptId: null })}
        title="Edit AI Rule"
        description="Update the rule and commit the change immediately."
        confirmButtonText="Save and commit"
        cancelButtonText="Cancel"
        variant="default"
        messages={[]}
        initialValues={(() => {
          const p = findPromptById(editDialog.promptId);
          const parsed = parsePromptText(String((p as any)?.prompt ?? ''));
          return {
            title: String((p as any)?.title ?? parsed.title ?? ''),
            directive: String((p as any)?.directive ?? 'process'),
            prompt: String((p as any)?.prompt ?? ''),
          };
        })()}
        fields={[
          { type: 'text', name: 'title', label: 'Title', placeholder: 'Short descriptive title', required: true },
          {
            type: 'select', name: 'directive', label: 'Directive', placeholder: 'Select directive', required: true,
            options: [
              { value: 'process', label: 'Process (general processing)' },
              { value: 'identify', label: 'Identify (mark content for review)' },
              { value: 'redact', label: 'Redact (remove or obfuscate sensitive content)' },
              { value: 'preserve', label: 'Preserve (explicitly keep content)' },
              { value: 'exclude', label: 'Exclude (ignore specific content)' },
            ],
          },
          { type: 'textarea', name: 'prompt', label: 'Prompt', placeholder: 'Detailed instructions for the AI', required: true },
        ]}
        onSubmit={async (values) => {
          const p = findPromptById(editDialog.promptId);
          if (!p) { toast.error('Prompt not found'); throw new Error('validation'); }
          const title = String(values.title ?? '').trim();
          const directive = String(values.directive ?? '').trim();
          const promptBody = String(values.prompt ?? '').trim();
          if (!title || !promptBody || !directive) {
            toast.error('Please fill in title, directive, and prompt');
            throw new Error('validation');
          }
          updatePrompt(p.id, { title, directive, prompt: promptBody });
          const res = await save();
          if (!res.ok) { toast.error('Failed to save changes'); throw new Error('api'); }
          toast.success('Rule updated and committed');
          setEditDialog({ open: false, promptId: null });
        }}
      />
    </>
  );
}
