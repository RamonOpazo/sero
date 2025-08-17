import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { X, Globe, MapPin, MousePointer2 } from "lucide-react";
import { useSelections } from "../core/SelectionProvider";
import { useMemo } from "react";
import { cn } from "@/lib/utils";


export default function SelectionList() {
  const { 
    state: selectionState, 
    selectedSelection, 
    selectSelection, 
    deleteSelection
  } = useSelections();

  // Use all selections from the manager with type information
  const selectionsWithTypeInfo = useMemo(() => {
    const saved = selectionState.savedSelections.map((sel) => ({
      ...sel,
      type: 'saved' as const,
      displayId: sel.id,
    }));
    const newOnes = selectionState.newSelections.map((sel) => ({
      ...sel,
      type: 'new' as const,
      displayId: sel.id,
    }));
    return [...saved, ...newOnes];
  }, [selectionState.savedSelections, selectionState.newSelections]);

  // Group selections by type for better organization
  const groupedSelections = useMemo(() => {
    const saved = selectionsWithTypeInfo.filter(sel => sel.type === 'saved');
    const newOnes = selectionsWithTypeInfo.filter(sel => sel.type === 'new');
    return { saved, new: newOnes };
  }, [selectionsWithTypeInfo]);

  const handleRemoveSelection = (selectionId: string) => {
    // Use new system's deleteSelection method
    deleteSelection(selectionId);
  };

  const handleSelectSelection = (selectionId: string) => {
    // Toggle selection - if already selected, deselect; otherwise select
    if (selectedSelection?.id === selectionId) {
      selectSelection(null);
    } else {
      selectSelection(selectionId);
    }
  };

  const formatDimensions = (width: number, height: number): string => {
    return `${width.toFixed(0)}×${height.toFixed(0)}`;
  };

  const renderSelectionItem = (sel: typeof selectionsWithTypeInfo[0]) => {
    const isGlobal = sel.page_number === null || sel.page_number === 0;
    const pageDisplay = isGlobal ? 'All' : `P${sel.page_number}`;
    const isSelected = selectedSelection?.id === sel.id;
    
    return (
      <div
        key={sel.displayId}
        className={cn(
          "group flex items-center gap-2 p-2 rounded-md border text-xs transition-colors cursor-pointer",
          isSelected 
            ? "bg-primary/10 border-primary/30 text-primary-foreground" 
            : "border-border/50 hover:bg-muted/50"
        )}
        onClick={() => handleSelectSelection(sel.id)}
      >
        <Badge 
          variant={sel.type === 'new' ? 'default' : 'secondary'} 
          className="text-xs h-5 px-1.5 flex-shrink-0"
        >
          {sel.type === 'new' ? 'New' : 'Saved'}
        </Badge>
        
        <div className="flex items-center gap-1 text-muted-foreground min-w-0">
          {isGlobal ? (
            <><Globe className="h-3 w-3" /> {pageDisplay}</>
          ) : (
            <><MapPin className="h-3 w-3" /> {pageDisplay}</>
          )}
        </div>
        
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="font-mono text-xs truncate text-muted-foreground">
            {sel.x.toFixed(1)}, {sel.y.toFixed(1)}
          </div>
          <div className="font-mono text-xs text-muted-foreground/70">
            {formatDimensions(sel.width, sel.height)}
          </div>
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveSelection(sel.id);
          }}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  if (selectionsWithTypeInfo.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-md">
        <MousePointer2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <div>No selections yet</div>
        <div className="text-xs opacity-70 mt-1">Click and drag to create selections</div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-80">
      <div className="space-y-1 pr-4">
        {/* Show all selections in order: new first, then saved */}
        {groupedSelections.new.map(renderSelectionItem)}
        {groupedSelections.saved.map(renderSelectionItem)}
      </div>
    </ScrollArea>
  );
}
