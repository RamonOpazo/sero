import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PromptsList from "../tooldeck/prompt-list";
import type { MinimalDocumentType } from '@/types';
import { useMemo } from 'react';
import { usePrompts } from '../../providers/prompt-provider';

interface Props {
  document: MinimalDocumentType;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export default function PromptPanelLayer({ document, isVisible, onToggleVisibility }: Props) {
  const visibilityClasses = isVisible
    ? 'opacity-100 translate-x-0 pointer-events-auto'
    : 'opacity-0 -translate-x-2 pointer-events-none';

  const { state: promptState, allPrompts, pendingChanges: promptPending } = usePrompts();

  const stats = useMemo(() => {
    const persisted: any[] = (promptState as any)?.persistedItems || [];
    const drafts: any[] = (promptState as any)?.draftItems || [];
    const total = (allPrompts || []).length;
    const saved = persisted.length;
    const created = drafts.length;
    const stagedPersisted = persisted.filter(p => (p as any)?.state && (p as any).state !== 'committed').length;
    const pending = ((promptPending?.creates || []).length) + ((promptPending?.updates || []).length) + ((promptPending?.deletes || []).length);
    return { total, saved, created, stagedPersisted, pending };
  }, [promptState, allPrompts, promptPending]);

  return (
    <div
      className={cn(
        "absolute top-0 left-0 bottom-0",
        "flex flex-col gap-4 w-[60ch] max-w-[60ch] p-4",
        "rounded-l-md border border-r-0 bg-background/90 backdrop-blur-xs backdrop-saturate-0",
        "text-xs transition-all duration-200 ease-out",
        `${visibilityClasses}`
      )}
      aria-hidden={!isVisible}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleVisibility}
        className="absolute top-4 right-4"
        aria-label="Close prompts panel"
      >
        <X />
      </Button>

      <div className='mt-[4rem] grid grid-cols-2 gap-2'>
        <h2 className="col-span-2 uppercase tracking-wider text-muted-foreground mb-2">AI Rules Lifecycle</h2>

        <div className="col-span-2 flex items-center justify-between px-2 py-1 rounded border bg-muted/30">
          <span className="text-muted-foreground">Total</span>
          <span className="font-mono">{stats.total}</span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 rounded border bg-muted/30">
          <span className="text-muted-foreground">Saved</span>
          <span className="font-mono">{stats.saved}</span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 rounded border bg-muted/30">
          <span className="text-muted-foreground">New</span>
          <span className="font-mono">{stats.created}</span>
        </div>
      </div>

      <h2 className="uppercase tracking-wider text-muted-foreground -mb-2">Rules</h2>
      <div className="flex-1 min-h-0">
        <PromptsList documentId={document.id} onEditPrompt={() => {}} />
      </div>
    </div>
  );
}
