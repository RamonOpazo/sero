import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Bot, CheckCheck, MoreHorizontal, Settings, Trash2, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrompts } from "../providers/prompts-provider";
import type { PromptType, PromptCreateType } from "@/types";
import { FormConfirmationDialog } from "@/components/shared";
import { useViewportState } from "../providers/viewport-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Prompt = PromptType | (PromptCreateType & { id: string });

type PromptWithTypeInfo = Prompt & { isSaved: boolean, isCommitted: boolean, isTemplate: boolean, displayId: string }

function PromptItemDescription({ rule }: { rule: PromptWithTypeInfo }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium overflow-ellipsis line-clamp-1">{rule.title?.trim() || "Untitled"}</span>
      <span className="border-l-1 pl-2 text-muted-foreground line-clamp-2 break-words overflow-ellipsis">{rule.prompt}</span>
    </div>
  )
}

function PromptItemInfo({ rule, menu }: { rule: PromptWithTypeInfo, menu: React.ReactNode }) {
  return (
    <div className="flex flex-row gap-2 items-center">
      <Tooltip delayDuration={1000}>
        <TooltipTrigger>
          <Badge
            variant="outline"
          >{((w: string) => w.charAt(0).toUpperCase() + w.slice(1))(rule.directive)}</Badge>
        </TooltipTrigger>
        <TooltipContent>Using '{rule.directive}' rule directive</TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={1000}>
        <TooltipTrigger>
          <Save
            size="1.5em"
            className={rule.isSaved ? "text-emerald-600" : "text-amber-500"}
          />
        </TooltipTrigger>
        <TooltipContent>{rule.isSaved ? "Saved" : "Unsaved"}</TooltipContent>
      </Tooltip>

      {rule.isCommitted && (
        <Tooltip delayDuration={1000}>
          <TooltipTrigger>
            <CheckCheck
              size="1.5em"
              className="text-emerald-600"
            />
          </TooltipTrigger>
          <TooltipContent>Committed</TooltipContent>
        </Tooltip>
      )}

      {menu}
    </div>
  );
}

function PromptItemMenu({ rule, openEditDialog }: { rule: PromptWithTypeInfo, openEditDialog: (promptId: string) => void }) {
  const { deletePrompt } = usePrompts();
  const handleDeletePrompt = (promptId: string) => {
    deletePrompt(promptId);
    toast.success('Prompt deleted (not yet saved)');
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sx"
          variant="secondary"
          className="opacity-0 group-hover:opacity-100 transition-all duration-200"
          title="Row actions"
          aria-label="Row actions"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); openEditDialog(rule.id); }}
        >
          <Settings /> Edit rule
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={(e) => { e.stopPropagation(); handleDeletePrompt(rule.id); }}
        >
          <Trash2 /> Delete rule
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PromptItem({ rule, openEditDialog }: { rule: PromptWithTypeInfo, openEditDialog: (promptId: string) => void }) {
  const menu = <PromptItemMenu rule={rule} openEditDialog={openEditDialog} />
  return (
    <div
      key={rule.id}
      tabIndex={0}
      className={cn(
        'relative space-y-2',
        'group p-4 text-xs cursor-pointer focus:outline-none focus:ring-0',
        'border-l-2 border-transparent',
        'bg-muted/30',
        'transition-all duration-200',
        'hover:border-l-muted-foreground/30 hover:bg-muted/30',
        'focus:border-l-primary/50 focus:bg-muted/70',
      )}
    >
      <PromptItemDescription rule={rule} />
      <PromptItemInfo rule={rule} menu={menu} />
    </div>
  )
}

export default function PromptListing() {
  const { setActiveControlsPanel } = useViewportState();
  const {
    state,
    updatePrompt,
    save,
    uiPrompts,
  } = usePrompts();

  const [editDialog, setEditDialog] = useState<{ open: boolean; promptId?: string }>({ open: false });

  const savedPrompts = (state).persistedItems || [];
  const newPrompts = (state).draftItems || [];
  const isLoading = (state).isLoading || false;
  const error = (state).error || null;

  // Enhanced prompts with type information and modification status
  const promptsWithTypeInfo = useMemo<PromptWithTypeInfo[]>(() => {
    const ui = (uiPrompts || []);
    return ui.map((p) => {
      const isSaved = !p.isUnsaved;
      const isCommitted = p.state === "committed";
      const isTemplate = p.scope === "project";
      return { ...p, isSaved, isCommitted, isTemplate, displayId: p.id };
    });
  }, [uiPrompts]);

  type FilterMode = 'all' | 'identify' | 'redact' | 'exclude';
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const filteredPrompts = useMemo(() => {
    switch (filterMode) {
      case 'identify':
        return promptsWithTypeInfo.filter(sel => sel.directive === "identify");
      case 'redact':
        return promptsWithTypeInfo.filter(sel => sel.directive === "redact");
      case 'exclude':
        return promptsWithTypeInfo.filter(sel => sel.directive === "exclude");
      default:
        return promptsWithTypeInfo;
    }
  }, [promptsWithTypeInfo, filterMode]);

  const groupedPrompts = useMemo(() => {
    const saved = filteredPrompts.filter(sel => sel.isSaved);
    const newOnes = filteredPrompts.filter(sel => !sel.isSaved);
    return { saved, new: newOnes };
  }, [filteredPrompts]);

  const openEditDialog = (id: string) => {
    setEditDialog({ open: true, promptId: id });
  };

  const findPromptById = (id?: string): Prompt | undefined => {
    if (id === undefined) return undefined;
    const all: Prompt[] = [...(newPrompts as Prompt[]), ...(savedPrompts as Prompt[])];
    return all.find((p) => p.id === id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2">Loading AI rules...</span>
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

  if (promptsWithTypeInfo.length === 0) {
    return (
      <div className="flex flex-col gap-2 items-center p-4 m-4 text-xs text-muted-foreground text-center border border-dashed rounded-md">
        <Bot className="h-8 w-8 mb-2" />
        <span className="font-medium text-sm">No AI rules yet</span>
        <span>Go to 'Rules {">"} Add Rule' to create your first AI rule</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center gap-2 p-4 pb-0">
        <Bot size="1.2rem" />
        <div className="font-medium truncate">AI Rules</div>
        <Button
          variant="secondary"
          size="sx"
          className="ml-auto"
          aria-label="Close Workbench"
          title="Close Workbench"
          onClick={() => setActiveControlsPanel('document-controls')}
        >
          <X />
        </Button>
      </div>

      <Separator />

      <div className="flex flex-0 items-center justify-between px-4">
        <div className="text-xs text-muted-foreground">
          {filteredPrompts.length} of {promptsWithTypeInfo.length}
        </div>
        <Select value={filterMode} onValueChange={(v) => setFilterMode(v as any)}>
          <SelectTrigger size="sm" className="text-xs">
            <SelectValue placeholder="All rules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All rules</SelectItem>
            <SelectItem value="identify">Identification rules</SelectItem>
            <SelectItem value="redact">Redaction rules</SelectItem>
            <SelectItem value="exclude">Exclusion rules</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        <div className="space-y-2">
          {[...groupedPrompts.new, ...groupedPrompts.saved].map((prompt) => (
            <PromptItem
              key={prompt.id}
              rule={prompt}
              openEditDialog={openEditDialog}
            />
          ))}
        </div>
      </div>

      {/* Inline Edit Rule Dialog */}
      <FormConfirmationDialog
        isOpen={editDialog.open}
        onClose={() => setEditDialog({ open: false })}
        title="Edit AI Rule"
        description="Update the rule and commit the change immediately."
        confirmButtonText="Save and commit"
        cancelButtonText="Cancel"
        variant="default"
        messages={[]}
        initialValues={(() => {
          const p = findPromptById(editDialog.promptId);
          return {
            title: p?.title || "Untitled",
            directive: p?.directive,
            prompt: p?.prompt,
          };
        })()}
        fields={[
          { type: 'text', name: 'title', label: 'Title', placeholder: 'Short descriptive title', required: true },
          {
            type: 'select', name: 'directive', label: 'Directive', placeholder: 'Select directive', required: true,
            options: [
              { value: 'identify', label: 'Identify' },
              { value: 'redact', label: 'Redact' },
              { value: 'exclude', label: 'Exclude' },
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
          setEditDialog({ open: false });
        }}
      />
    </div>
  );
}
