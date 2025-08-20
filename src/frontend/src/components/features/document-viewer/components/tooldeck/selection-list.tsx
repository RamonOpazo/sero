import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, MousePointer2, Globe, Hash } from "lucide-react";
import { useSelections } from "../../providers/selection-provider";
import { useViewportState } from "../../providers/viewport-provider";
import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { PageSelectionDialog } from "../dialogs";
import type { Selection } from "../../types/viewer";


export default function SelectionList() {
  const { 
    state: selectionState, 
    selectedSelection, 
    selectSelection, 
    deleteSelection,
    setSelectionPage,
    setOnSelectionDoubleClick
  } = useSelections();
  
  const { setCurrentPage, currentPage, numPages } = useViewportState();
  
  // Dialog state for page selection
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    selectionId: string | null;
  }>({ isOpen: false, selectionId: null });
  
  // Refs to track selection items for scrolling
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Auto-scroll to selected item when selection changes
  useEffect(() => {
    if (selectedSelection?.id) {
      const selectedElement = itemRefs.current[selectedSelection.id];
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }
  }, [selectedSelection?.id]);

  // Use all selections from the manager with type information and modification status
  const selectionsWithTypeInfo = useMemo(() => {
    const initialSavedSelections = selectionState.initialState.savedItems;
    
    const saved = (selectionState.savedItems || []).map((sel: Selection) => {
      // Check if this saved selection was modified from its initial state
      const initialSelection = initialSavedSelections?.find((initial: Selection) => initial.id === sel.id);
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
    
    const newOnes = (selectionState.newItems || []).map((sel: Selection) => ({
      ...sel,
      type: 'new' as const,
      isModified: false,
      displayId: sel.id,
    }));
    
    return [...saved, ...newOnes];
  }, [selectionState]);

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
      // Remove focus from the element when deselecting to prevent focus styles from showing
      const element = itemRefs.current[selectionId];
      if (element) {
        element.blur();
      }
    } else {
      selectSelection(selectionId);
      
      // Navigate to the selection's page if it's not global (null) and we're not already on that page
      if (selection && selection.page_number !== null && selection.page_number !== undefined && selection.page_number !== currentPage) {
        setCurrentPage(selection.page_number);
      }
    }
  };

  const handleToggleGlobal = (selectionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selection when clicking the badge
    
    // Always open dialog for better UX - prevents accidental changes
    setDialogState({ isOpen: true, selectionId });
  };
  
  const handleDialogConfirm = (pageNumber: number | null) => {
    if (dialogState.selectionId) {
      setSelectionPage(dialogState.selectionId, pageNumber);
    }
    setDialogState({ isOpen: false, selectionId: null });
  };
  
  const handleDialogClose = () => {
    setDialogState({ isOpen: false, selectionId: null });
  };

  // Handle double-click from SelectionsLayer
  const handleSelectionDoubleClick = useCallback((selection: Selection) => {
    setDialogState({ isOpen: true, selectionId: selection.id });
  }, []);

  // Register double-click handler on mount
  useEffect(() => {
    setOnSelectionDoubleClick(handleSelectionDoubleClick);
    return () => {
      setOnSelectionDoubleClick(undefined); // Cleanup on unmount
    };
  }, [setOnSelectionDoubleClick, handleSelectionDoubleClick]);

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
        ref={(el) => {
          itemRefs.current[sel.id] = el;
        }}
        className={cn(
          // Base classes always applied
          "group pr-4 py-3 text-xs cursor-pointer focus:outline-none focus:ring-0",
          // Selection-specific classes
          isSelected ? [
            // Selected state (no hover effects)
            "border-l-2 border-l-primary bg-primary/3 shadow-sm pl-4"
          ] : [
            // Unselected state (with hover and focus effects)
            "border-l-2 border-transparent pl-0 shadow-none",
            "transition-all duration-200",
            "hover:border-l-muted-foreground/30 hover:pl-4 hover:bg-muted/10",
            "focus:border-l-primary/50 focus:pl-4 focus:bg-muted/20 focus:shadow-sm"
          ]
        )}
        onClick={() => handleSelectSelection(sel.id)}
        tabIndex={0}
      >
        {/* Top row: Page badge, status, and delete button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              className={cn(
                "flex items-center gap-1 font-medium px-2 py-0.5 rounded text-xs transition-colors hover:opacity-80 cursor-pointer",
                isGlobal ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" :
                "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              )}
              onClick={(e) => handleToggleGlobal(sel.id, e)}
              title="Click to change page assignment"
            >
              {isGlobal ? <Globe className="h-3 w-3" /> : <Hash className="h-3 w-3" />}
              {pageDisplay}
            </button>
            
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
    <>
      <ScrollArea className="h-80 hide-scrollbar">
        <div>
          {/* Show all selections in order: new first, then saved */}
          {[...groupedSelections.new, ...groupedSelections.saved].map((sel) => (
            renderSelectionItem(sel)
          ))}
        </div>
      </ScrollArea>
      
      {/* Page Selection Dialog */}
      <PageSelectionDialog
        isOpen={dialogState.isOpen}
        onClose={handleDialogClose}
        onConfirm={handleDialogConfirm}
        currentPage={currentPage}
        totalPages={numPages}
        selectionId={dialogState.selectionId ?? undefined}
      />
    </>
  );
}
