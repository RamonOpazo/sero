import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, MousePointer2, Globe, Hash, Settings, Telescope, Bot, RotateCcw } from "lucide-react";
import { useSelections } from "../../providers/selection-provider";
import { useViewportState } from "../../providers/viewport-provider";
import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { FormConfirmationDialog } from "@/components/shared";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { TypedMessage } from "@/components/shared/typed-confirmation-dialog";
import { SimpleConfirmationDialog } from "@/components/shared/simple-confirmation-dialog";
import { CONVERT_TO_STAGED_DIALOG } from "./dialog-text";
import type { Selection } from "../../types/viewer";
import { getNormalizedState, getStatusLabel } from "../../utils/selection-styles";
import { useWorkspace } from "@/providers/workspace-provider";


export default function SelectionList() {
  const {
    dispatch,
    selectedSelection,
    selectSelection,
    deleteSelection,
    setSelectionPage,
    setOnSelectionDoubleClick,
    convertSelectionToStagedEdition,
    uiSelections,
  } = useSelections() as any;

  const { setCurrentPage, currentPage, numPages } = useViewportState();
  const { state: workspace } = useWorkspace();
  const isProjectScopedDocument = !!workspace.currentDocument?.is_template;

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

  // Use lifecycle-aware UI selections with dirty/stage metadata
  const selectionsWithTypeInfo = useMemo(() => {
    const ui = (uiSelections || []) as any[];
    return ui.map((sel: any) => {
      const type = sel.isPersisted ? 'saved' : 'new';
      const isModified = !!sel.dirty;
      const isAi = !!(sel as any).is_ai_generated;
      const confidence = (sel as any).confidence as number | null | undefined;
      return { ...sel, type, isModified, is_ai_generated: isAi, confidence, displayId: sel.id } as any;
    });
  }, [uiSelections]);

  // Group selections by type for better organization
  // Filter: optionally hide AI-generated selections
  type FilterMode = 'all' | 'ai' | 'manual';
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const filteredSelections = useMemo(() => {
    switch (filterMode) {
      case 'ai':
        return selectionsWithTypeInfo.filter(sel => !!sel.is_ai_generated);
      case 'manual':
        return selectionsWithTypeInfo.filter(sel => !sel.is_ai_generated);
      default:
        return selectionsWithTypeInfo;
    }
  }, [selectionsWithTypeInfo, filterMode]);

  const groupedSelections = useMemo(() => {
    const saved = filteredSelections.filter(sel => sel.type === 'saved');
    const newOnes = filteredSelections.filter(sel => sel.type === 'new');
    return { saved, new: newOnes };
  }, [filteredSelections]);

  // Stable initial values for dialog to avoid hook order changes
  const initialDialogValues = useMemo(() => ({ isGlobal: false, page: currentPage + 1 }), [currentPage]);

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
    const norm = getNormalizedState((sel as any).state);
    const pageDisplay = isGlobal ? 'Global' : `Page ${(sel.page_number ?? 0) + 1}`;
    const isSelected = selectedSelection?.id === sel.id;
    const isModified = !!sel.dirty;
    const isProjectScope = (sel as any).scope === 'project';

    // Determine status indicator using lifecycle metadata
    const getStatusIndicator = () => {
      // Explicit staged states take precedence
      if (sel.stage === 'staged_creation' || sel.stage === 'staged_edition' || sel.stage === 'staged_deletion' || sel.stage === 'committed') {
        const lab = getStatusLabel(sel.stage as any);
        return { color: lab.colorClass, title: lab.title, label: lab.label };
      }
      // Otherwise, reflect local state
      if (!sel.isPersisted) return { color: 'bg-emerald-500', title: 'Unstaged (local)', label: 'Unstaged' };
      if (isModified) return { color: 'bg-amber-500', title: 'Modified', label: 'Modified' };
      return { color: 'bg-gray-400', title: 'Saved', label: 'Saved' };
    };

    const statusIndicator = getStatusIndicator();

    return (
      <div
        key={sel.displayId}
        ref={(el) => { itemRefs.current[sel.id] = el }}
        className={cn(
          "group p-2 text-xs cursor-pointer focus:outline-none focus:ring-0",
          "border-l-2 border-transparent",
          "bg-muted/30 pl-3",
          "transition-all duration-200",
          "hover:border-l-muted-foreground/30 hover:pl-5 hover:bg-muted/30",
          "focus:border-l-primary/50 focus:pl-5 focus:bg-muted/70",
          isSelected && "border-l-2 border-l-primary pl-5 bg-primary/5"
        )}
        onClick={() => handleSelectSelection(sel.id)}
        tabIndex={0}
      >
        {/* Top row: Simple coordinates */}
        <div className="text-sm mt-1">
          <span className="text-muted-foreground">Coords:</span> {formatValue(sel.x)}, {formatValue(sel.y)} • {formatValue(sel.width)} × {formatValue(sel.height)}
        </div>

        {/* Bottom row: Page badge, status, and delete button */}
        <div className="flex items-center justify-between">
          <div className="flex justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-sm">{statusIndicator.label}</span>
                <div className={cn("w-1.5 h-1.5 rounded-full", statusIndicator.color)} title={statusIndicator.title} />
              </div>
              {sel.is_ai_generated && (
                <Badge variant="secondary" title={`AI${sel.confidence != null ? ` (${Math.round(sel.confidence * 100)}%)` : ''}`}>
                  <Bot className="h-3 w-3 mr-1" />
                  AI{sel.confidence != null ? ` ${Math.round(sel.confidence * 100)}%` : ''}
                </Badge>
              )}
              <Badge
                variant={isProjectScope ? "destructive" : "outline"}
                title={isProjectScope ? "Project scope" : "Document scope"}
                data-testid={`selection-scope-${sel.id}`}
                className="ml-1"
              >
                <Telescope className="h-3 w-3 mr-1" />
                {isProjectScope ? 'Project' : 'Document'}
              </Badge>
            </div>

            <Badge
              variant="outline"
              data-testid={`selection-toggle-${sel.id}`}
              onClick={(e) => handleToggleGlobal(sel.id, e)}
            >
              {isGlobal ? <Globe className="h-3 w-3" /> : <Hash className="h-3 w-3" />}
              {pageDisplay}
            </Badge>
          </div>

          {/* Config and delete buttons */}
          <div className="flex items-center gap-1 mr-1">
            <Button
              disabled={!isProjectScopedDocument || norm === 'committed' || norm === 'staged_deletion'}
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                if (!isProjectScopedDocument || norm === 'committed' || norm === 'staged_deletion') return;
                const nextScope = (sel as any).scope === 'project' ? 'document' : 'project';
                // Update only the scope via domain manager dispatch to avoid leaking UI fields
                dispatch('UPDATE_ITEM', { id: sel.id, updates: { scope: nextScope } });
              }}
              className="h-6 w-6 p-0 text-muted-foreground/60 hover:text-foreground hover:bg-muted/10 opacity-0 group-hover:opacity-100 transition-all duration-200 disabled:opacity-50"
              title={isProjectScopedDocument ? "Toggle scope (project/document)" : "Scope change available only in project template documents"}
              aria-label="Change scope"
            >
              <Telescope className="h-3 w-3" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                if (norm === 'committed' || norm === 'staged_deletion') {
                  setConvertDialog({ open: true, selectionId: sel.id });
                } else {
                  setDialogState({ isOpen: true, selectionId: sel.id });
                }
              }}
              className="h-6 w-6 p-0 text-muted-foreground/60 hover:text-foreground hover:bg-muted/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
              title="Configure selection"
              aria-label="Configure selection"
            >
              <Settings className="h-3 w-3" />
            </Button>

            {norm === 'staged_deletion' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async (e) => {
                  e.stopPropagation();
                  await convertSelectionToStagedEdition(sel.id);
                }}
                className="h-6 w-6 p-0 text-muted-foreground/60 hover:text-foreground hover:bg-muted/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                title="Convert deletion to edition"
                aria-label="Convert deletion to edition"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveSelection(sel.id);
              }}
              className="h-6 w-6 p-0 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
              title="Delete selection"
              aria-label="Delete selection"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
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
      {/* Filter controls */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Select value={filterMode} onValueChange={(v) => setFilterMode(v as any)}>
            <SelectTrigger className="h-7 w-[12rem] text-xs">
              <SelectValue placeholder="All selections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All selections</SelectItem>
              <SelectItem value="ai">AI-generated</SelectItem>
              <SelectItem value="global">Document-spannig</SelectItem>
              <SelectItem value="project">Project-scoped</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="font-mono">{filteredSelections.length}</span> / <span className="font-mono">{selectionsWithTypeInfo.length}</span>
        </div>
      </div>

      <div className="h-full overflow-auto">
        <div className="space-y-1">
          {/* Show all selections in order: new first, then saved */}
          {[...groupedSelections.new, ...groupedSelections.saved].map((sel) => (
            renderSelectionItem(sel)
          ))}
        </div>
      </div>

      {/* Page Selection Dialog (inline) */}
      <FormConfirmationDialog
        isOpen={dialogState.isOpen}
        onClose={handleDialogClose}
        title="Choose Target Page"
        description="Configure how this selection should be displayed across the document."
        confirmButtonText="Apply"
        cancelButtonText="Cancel"
        variant="default"
        messages={([
          { variant: 'info', title: 'Usage', description: `Currently viewing page ${currentPage + 1} of ${numPages}. Toggle global to show on all pages, or pick a page number.` },
        ] as TypedMessage[])}
        initialValues={initialDialogValues}
        fields={[
          { type: 'switch', name: 'isGlobal', label: 'Global Selection', tooltip: 'Appear on all pages' },
          { type: 'number', name: 'page', label: 'Target Page Number', placeholder: `Enter page number (1-${numPages})`, required: true, tooltip: `Range: 1 to ${numPages}`, min: 1, max: numPages, step: 1 },
        ]}
        onSubmit={async (values) => {
          const isGlobal = !!values.isGlobal;
          if (isGlobal) {
            handleDialogConfirm(null);
            return;
          }
          const pageNum = Number(values.page);
          if (!Number.isFinite(pageNum) || pageNum < 1 || pageNum > numPages) {
            throw new Error('Invalid page number');
          }
          handleDialogConfirm(pageNum - 1);
        }}
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
