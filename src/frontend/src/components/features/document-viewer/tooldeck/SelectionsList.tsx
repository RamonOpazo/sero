import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Widget, WidgetHeader, WidgetTitle, WidgetBody } from "@/components/shared/Widget";
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
      <Widget className="py-2">
        <WidgetHeader className="pb-1">
          <WidgetTitle className="text-xs">Selection List</WidgetTitle>
        </WidgetHeader>
        <WidgetBody className="pt-0">
          <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded">
            No selections yet
          </div>
        </WidgetBody>
      </Widget>
    );
  }

  return (
    <Widget className="py-2">
      <WidgetHeader className="pb-1">
        <WidgetTitle className="text-xs">Selection List</WidgetTitle>
      </WidgetHeader>
      <WidgetBody className="pt-0">
        <div className="space-y-1">
          {selectionsWithTypeInfo.slice(0, 8).map((sel) => {
            const isGlobal = sel.page_number === null || sel.page_number === 0;
            const pageDisplay = isGlobal ? 'All' : `P${sel.page_number}`;
            
            return (
              <div
                key={sel.displayId}
                className="flex items-center gap-2 p-1 rounded border text-xs hover:bg-muted/50 transition-colors"
              >
                <Badge variant={sel.type === 'new' ? 'default' : 'secondary'} className="text-xs h-4 px-1">
                  {sel.type === 'new' ? 'N' : 'S'}
                </Badge>
                <div className="flex items-center gap-1 text-muted-foreground min-w-0">
                  {isGlobal ? (
                    <><Globe className="h-3 w-3" /> {pageDisplay}</>
                  ) : (
                    <><MapPin className="h-3 w-3" /> {pageDisplay}</>
                  )}
                </div>
                <div className="text-muted-foreground font-mono text-xs truncate flex-1">
                  {sel.x.toFixed(2)},{sel.y.toFixed(2)}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveSelection(sel.id)}
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
          {selectionsWithTypeInfo.length > 8 && (
            <div className="text-xs text-muted-foreground text-center py-1 border border-dashed rounded">
              +{selectionsWithTypeInfo.length - 8} more selections
            </div>
          )}
        </div>
      </WidgetBody>
    </Widget>
  );
}
