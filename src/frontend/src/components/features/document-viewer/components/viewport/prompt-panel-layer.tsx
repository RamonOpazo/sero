import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PromptsList from "../tooldeck/prompt-list";
import type { MinimalDocumentType } from '@/types';

interface Props {
  document: MinimalDocumentType;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export default function PromptPanelLayer({ document, isVisible, onToggleVisibility }: Props) {
  const visibilityClasses = isVisible
    ? 'opacity-100 translate-x-0 pointer-events-auto'
    : 'opacity-0 -translate-x-2 pointer-events-none';

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

      <div className='mt-[4rem]'>
        <h2 className="uppercase tracking-wider text-muted-foreground mb-2">AI Rules</h2>
        <div className="ml-4 space-y-1">
          <div><span className="text-muted-foreground">Document:</span> <span className="font-medium">{document.name}</span></div>
        </div>
      </div>

      <h2 className="uppercase tracking-wider text-muted-foreground -mb-2">Rules</h2>
      <div className="flex-1 min-h-0">
        <PromptsList documentId={document.id} onEditPrompt={() => {}} />
      </div>
    </div>
  );
}
