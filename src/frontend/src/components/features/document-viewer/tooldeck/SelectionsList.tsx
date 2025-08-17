import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Globe, MapPin } from "lucide-react";
import { useSelections } from "../core/SelectionProvider";
import { useMemo } from "react";


export default function SelectionList() {
  const { state: selectionState, deleteSelection } = useSelections();

  // Combine all selections with type information from new system
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

  const handleRemoveSelection = (selectionId: string) => {
    // Use new system's deleteSelection method
    deleteSelection(selectionId);
  };

  if (selectionsWithTypeInfo.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-md">
        No selections yet
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {selectionsWithTypeInfo.slice(0, 10).map((sel) => {
        const isGlobal = sel.page_number === null || sel.page_number === 0;
        const pageDisplay = isGlobal ? 'All' : `P${sel.page_number}`;
        
        return (
          <div
            key={sel.displayId}
            className="group flex items-center gap-2 p-2 rounded-md border border-border/50 text-xs hover:bg-muted/50 transition-colors"
          >
            <Badge variant={sel.type === 'new' ? 'default' : 'secondary'} className="text-xs h-5 px-1.5">
              {sel.type === 'new' ? 'New' : 'Saved'}
            </Badge>
            <div className="flex items-center gap-1 text-muted-foreground min-w-0">
              {isGlobal ? (
                <><Globe className="h-3 w-3" /> {pageDisplay}</>
              ) : (
                <><MapPin className="h-3 w-3" /> {pageDisplay}</>
              )}
            </div>
            <div className="text-muted-foreground font-mono text-xs truncate flex-1">
              {sel.x.toFixed(1)}, {sel.y.toFixed(1)}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRemoveSelection(sel.id)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
      {selectionsWithTypeInfo.length > 10 && (
        <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">
          +{selectionsWithTypeInfo.length - 10} more selections
        </div>
      )}
    </div>
  );
}
