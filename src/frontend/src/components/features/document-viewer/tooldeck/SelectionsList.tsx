import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { X, MousePointer2 } from "lucide-react";
import { useSelections } from "../core/SelectionProvider";
import { useViewportState } from "../core/ViewportState";
import { useMemo } from "react";
import { cn } from "@/lib/utils";


export default function SelectionList() {
  const { 
    state: selectionState, 
    selectedSelection, 
    selectSelection, 
    deleteSelection
  } = useSelections();
  
  const { setCurrentPage } = useViewportState();

  // Use all selections from the manager with type information and modification status
  const selectionsWithTypeInfo = useMemo(() => {
    const initialSavedSelections = selectionState.initialState.savedSelections;
    
    const saved = selectionState.savedSelections.map((sel) => {
      // Check if this saved selection was modified from its initial state
      const initialSelection = initialSavedSelections.find(initial => initial.id === sel.id);
      const isModified = initialSelection && (
        sel.x !== initialSelection.x ||
        sel.y !== initialSelection.y ||
        sel.width !== initialSelection.width ||
        sel.height !== initialSelection.height ||
        sel.page_number !== initialSelection.page_number
      );
      
      return {
        ...sel,
        type: 'saved' as const,
        isModified: !!isModified,
        displayId: sel.id,
      };
    });
    
    const newOnes = selectionState.newSelections.map((sel) => ({
      ...sel,
      type: 'new' as const,
      isModified: false,
      displayId: sel.id,
    }));
    
    return [...saved, ...newOnes];
  }, [selectionState.savedSelections, selectionState.newSelections, selectionState.initialState]);

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
    // Find the selection to get its page number
    const selection = selectionsWithTypeInfo.find(sel => sel.id === selectionId);
    
    // Toggle selection - if already selected, deselect; otherwise select
    if (selectedSelection?.id === selectionId) {
      selectSelection(null);
    } else {
      selectSelection(selectionId);
      
      // Navigate to the selection's page if it's not global (null)
      if (selection && selection.page_number !== null && selection.page_number !== undefined) {
        setCurrentPage(selection.page_number);
      }
    }
  };

  const formatValue = (value: number): string => {
    return value.toFixed(2);
  };


  const renderSelectionItem = (sel: typeof selectionsWithTypeInfo[0]) => {
    const isGlobal = sel.page_number === null;
    const pageDisplay = isGlobal ? 'Global' : `Page ${(sel.page_number ?? 0) + 1}`;
    const isSelected = selectedSelection?.id === sel.id;
    const isNew = sel.type === 'new';
    const isModified = sel.isModified;
    
    // Determine status indicator
    const getStatusIndicator = () => {
      if (isNew) {
        return {
          color: "bg-green-500",
          title: "New selection",
          label: "New"
        };
      } else if (isModified) {
        return {
          color: "bg-amber-500",
          title: "Modified selection",
          label: "Modified"
        };
      } else {
        return {
          color: "bg-gray-400",
          title: "Saved selection",
          label: "Saved"
        };
      }
    };
    
    const statusIndicator = getStatusIndicator();
    
    return (
      <div
        key={sel.displayId}
        className={cn(
          "group pr-4 py-3 text-xs transition-all duration-200 cursor-pointer border-l-2 border-transparent focus:outline-none focus:ring-0",
          isSelected 
            ? "border-l-primary bg-primary/3 shadow-sm pl-4" 
            : "pl-0 hover:border-l-border hover:pl-4 focus:border-l-border focus:pl-4"
        )}
        onClick={() => handleSelectSelection(sel.id)}
        tabIndex={0}
      >
        {/* Top row: Page badge, status, and delete button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium px-2 py-0.5 rounded text-xs",
              isGlobal ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" :
              "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            )}>
              {pageDisplay}
            </span>
            
            <div className="flex items-center gap-1">
              <div className={cn("w-1.5 h-1.5 rounded-full", statusIndicator.color)} title={statusIndicator.title} />
              <span className="text-muted-foreground text-xs">{statusIndicator.label}</span>
            </div>
          </div>
          
          {/* Delete button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveSelection(sel.id);
            }}
            className="h-6 w-6 p-0 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Bottom row: Simple coordinates */}
        <div className="text-xs text-muted-foreground/60 mt-1.5">
          {formatValue(sel.x)}, {formatValue(sel.y)} • {formatValue(sel.width)} × {formatValue(sel.height)}
        </div>
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
    <ScrollArea className="h-80 hide-scrollbar">
      <div>
        {/* Show all selections in order: new first, then saved */}
        {[...groupedSelections.new, ...groupedSelections.saved].map((sel, index, array) => (
          <div key={sel.displayId}>
            {renderSelectionItem(sel)}
            {index < array.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
