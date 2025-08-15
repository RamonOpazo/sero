import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Widget, WidgetHeader, WidgetTitle, WidgetBody } from "@/components/shared/Widget";
import { X, Globe, MapPin } from "lucide-react";
import { useViewerState } from "./hooks/useViewerState";
import { useMemo } from "react";


export default function SelectionList() {
  const { existingSelections, newSelections, dispatch } = useViewerState();

  // Combine all selections with type information
  const allSelections = useMemo(() => {
    const existing = existingSelections.map((sel, index) => ({
      ...sel,
      type: 'existing' as const,
      index,
      displayId: sel.id || `existing-${index}`,
    }));
    const newOnes = newSelections.map((sel, index) => ({
      ...sel,
      type: 'new' as const,
      index,
      displayId: `new-${index}`,
      id: `new-${index}`, // Temporary ID for new selections
    }));
    return [...existing, ...newOnes];
  }, [existingSelections, newSelections]);

  const handleRemoveSelection = (type: 'existing' | 'new', index: number) => {
    if (type === 'new') {
      // Remove from new selections
      const updatedNewSelections = [...newSelections];
      updatedNewSelections.splice(index, 1);
      dispatch({
        type: 'SET_NEW_SELECTIONS',
        payload: updatedNewSelections
      });
    } else {
      // Remove from existing selections
      const updatedExistingSelections = [...existingSelections];
      updatedExistingSelections.splice(index, 1);
      dispatch({
        type: 'SET_EXISTING_SELECTIONS',
        payload: updatedExistingSelections
      });
    }
  };

  if (allSelections.length === 0) {
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
          {allSelections.slice(0, 8).map((sel) => {
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
                  onClick={() => handleRemoveSelection(sel.type, sel.index)}
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
          {allSelections.length > 8 && (
            <div className="text-xs text-muted-foreground text-center py-1 border border-dashed rounded">
              +{allSelections.length - 8} more selections
            </div>
          )}
        </div>
      </WidgetBody>
    </Widget>
  );
}
