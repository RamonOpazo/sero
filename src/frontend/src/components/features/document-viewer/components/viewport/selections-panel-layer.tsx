import { useMemo } from 'react';
import { X, ListTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSelections } from '../../providers/selection-provider';
import { getNormalizedState } from '../../utils/selection-styles';
import SelectionList from "../tooldeck/selection-list";
import type { MinimalDocumentType } from '@/types';

interface Props {
  document: MinimalDocumentType;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export default function SelectionsPanelLayer({ isVisible, onToggleVisibility }: Props) {
  const { uiSelections } = useSelections() as any;

  const stats = useMemo(() => {
    const ui = (uiSelections || []) as any[];
    const unstaged = ui.filter(s => s.dirty === true).length;
    const stagedCreation = ui.filter(s => (s.stage || getNormalizedState((s as any).state)) === 'staged_creation' || s.stage === 'staged_creation').length;
    const stagedEdition = ui.filter(s => (s.stage || getNormalizedState((s as any).state)) === 'staged_edition' || s.stage === 'staged_edition').length;
    const stagedDeletion = ui.filter(s => (s.stage || getNormalizedState((s as any).state)) === 'staged_deletion' || s.stage === 'staged_deletion').length;
    const committed = ui.filter(s => (s.stage || getNormalizedState((s as any).state)) === 'committed').length;
    return { unstaged, stagedCreation, stagedEdition, stagedDeletion, committed };
  }, [uiSelections]);

  const visibilityClasses = isVisible
    ? 'opacity-100 translate-x-0 pointer-events-auto'
    : 'opacity-0 -translate-x-2 pointer-events-none';

  return (
    <div
      className={cn(
        "absolute top-0 left-0 bottom-0 z-[2100]",
        "flex flex-col gap-4 w-[60ch] max-w-[60ch] p-4",
        "rounded-l-md bg-black/90 backdrop-blur-xs backdrop-saturate-0",
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
        aria-label="Close selections panel"
      >
        <X />
      </Button>

      <div className="flex items-center gap-2 mb-2">
        <ListTree className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Selections</h1>
      </div>

      {/* Lifecycle summary header (InfoLayer-like styling) */}
      <div>
        <h2 className="uppercase tracking-wider text-muted-foreground mb-2">Lifecycle</h2>
        <div className="ml-4 space-y-1">
          <div><span className="text-muted-foreground">Unstaged:</span> <span className="font-medium">{stats.unstaged}</span></div>
          <div><span className="text-muted-foreground">Staged:</span> <span>c:{stats.stagedCreation}, u:{stats.stagedEdition}, d:{stats.stagedDeletion}</span></div>
          <div><span className="text-muted-foreground">Committed:</span> <span>{stats.committed}</span></div>
        </div>
      </div>

      {/* Redesigned list: reuse existing list, which respects lifecycle actions */}
      <div className="flex-1 min-h-0">
        <SelectionList panelMode />
      </div>
    </div>
  );
}

