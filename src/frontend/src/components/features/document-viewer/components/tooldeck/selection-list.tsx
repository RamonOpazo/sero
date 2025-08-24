import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, MousePointer2, Globe, Hash } from "lucide-react";
import { useSelections } from "../../providers/selection-provider";
import { useViewportState } from "../../providers/viewport-provider";
import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { PageSelectionDialog } from "../dialogs";
import { SimpleConfirmationDialog } from "@/components/shared/simple-confirmation-dialog";
import { CONVERT_TO_STAGED_DIALOG } from "./dialog-text";
import type { Selection } from "../../types/viewer";
import { getNormalizedState, getStatusLabel } from "../../utils/selection-styles";


export default function SelectionList() {
  const { 
    state: selectionState, 
    selectedSelection, 
    selectSelection, 
    deleteSelection,
    setSelectionPage,
    setOnSelectionDoubleClick,
    convertSelectionToStagedEdition,
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
    const ui = ((selectionState as any).persistedItems || []).concat((selectionState as any).draftItems || []) as Selection[];
    return ui.map((sel: Selection) => {
      const stateNorm = getNormalizedState((sel as any).state);
      const type = stateNorm === 'draft' ? 'new' : 'saved';
      const isModified = stateNorm !== 'draft' && stateNorm !== 'committed';
      return { ...sel, type, isModified, displayId: sel.id } as any;
    });
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
    
    // Only non-committed selections can change page/global
    const selection = selectionsWithTypeInfo.find(sel => sel.id === selectionId);
    const norm = getNormalizedState((selection as any)?.state);
    const isCommitted = norm === 'committed';
    const isStagedDeletion = norm === 'staged_deletion';
    if (isCommitted || isStagedDeletion) return;

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
  const [convertDialog, setConvertDialog] = useState<{ open: boolean; selectionId: string | null }>({ open: false, selectionId: null });

  const handleSelectionDoubleClick = useCallback((selection: Selection) => {
    const norm = getNormalizedState((selection as any).state);
    const isCommitted = norm === 'committed';
    const isStagedDeletion = norm === 'staged_deletion';
    if (isCommitted || isStagedDeletion) {
      setConvertDialog({ open: true, selectionId: selection.id });
      return;
    }
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
      const norm = getNormalizedState((sel as any).state);
      if (norm === 'draft') {
        // Distinguish drafts vs saved but unmodified items visually
        if (isNew) return { color: 'bg-emerald-500', title: 'Unstaged (local)', label: 'Unstaged' };
        if (isModified) return { color: 'bg-amber-500', title: 'Modified', label: 'Modified' };
        return { color: 'bg-gray-400', title: 'Saved', label: 'Saved' };
      }
      const lab = getStatusLabel(norm);
      return { color: lab.colorClass, title: lab.title, label: lab.label };
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
              data-testid={`selection-toggle-${sel.id}`}
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
      {/* Convert committed to staged dialog */}
      <SimpleConfirmationDialog
        isOpen={convertDialog.open}
        onClose={() => setConvertDialog({ open: false, selectionId: null })}
        onConfirm={async () => {
          if (convertDialog.selectionId) {
            await convertSelectionToStagedEdition(convertDialog.selectionId);
            // Close regardless; UI will reflect updated state via provider
            setConvertDialog({ open: false, selectionId: null });
          }
        }}
        {...CONVERT_TO_STAGED_DIALOG}
      />
    </>
  );
}
