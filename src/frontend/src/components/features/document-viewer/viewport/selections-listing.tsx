import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SquareDashed, MoreHorizontal, Trash2, CheckCheck,  Save, Settings, Telescope, Bot, RotateCcw, X, type LucideIcon } from "lucide-react";
import { useSelections } from "../providers/selections-provider";
import { useViewportState } from "../providers/viewport-provider";
import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { FormConfirmationDialog } from "@/components/shared";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { TypedMessage } from "@/components/shared/typed-confirmation-dialog";
import { SimpleConfirmationDialog } from "@/components/shared/simple-confirmation-dialog";
import { CONVERT_TO_STAGED_DIALOG } from "../core/configs/dialogs-config";
import type { Selection } from "../types/viewer";
import { getNormalizedSelectionState } from "../utils";
import { useWorkspace } from "@/providers/workspace-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

type StatusIndicator = { color: string; title: string; icon: LucideIcon };

function computeSelectionItemState(sel: any) {
  const isGlobal = sel.page_number === null;
  const norm = getNormalizedSelectionState((sel as any).state);
  const pageDisplay = isGlobal ? 'Global' : `Page ${(sel.page_number ?? 0) + 1}`;
  const isProjectScope = (sel as any).scope === 'project';

  const statusIndicator: StatusIndicator = (() => {
    if (sel.stage === "committed") return { color: "text-emerald-600", title: `Committed`, icon: CheckCheck }
    if (sel.stage.startsWith("staged")) return { color: "text-amber-500", title: `Saved`, icon: Save }
    return { color: "text-red-600", title: `Unsaved`, icon: Save }
  })();

  return { isGlobal, norm, pageDisplay, isProjectScope, statusIndicator } as const;
}

function SelectionItemCoord({ sel }: any) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium overflow-ellipsis line-clamp-1">Coords</span>
      <span className="border-l-1 pl-2 text-muted-foreground line-clamp-2 break-words overflow-ellipsis">{sel.x.toFixed(2)}, {sel.y.toFixed(2)} • {sel.width.toFixed(2)} × {sel.height.toFixed(2)}</span>
    </div>
  )
}

function SelectionItemInfo({
  sel,
  statusIndicator,
  pageDisplay,
  menu,
}: {
  sel: any,
  statusIndicator: StatusIndicator,
  pageDisplay: string,
  onToggleGlobal: (id: string, e: React.MouseEvent) => void,
  menu: React.ReactNode,
}) {
  const isCommitted = statusIndicator.title === "Committed"
  const isSaved = statusIndicator.title !== "Unsaved"
  const isGlobal = sel.page_number === null;
  const isTemplate = sel.scope === "project";
  const isAI = !!sel.is_ai_generated;
  const confidence = sel.confidence as number | null | undefined;

  return (
    <div className="flex flex-row gap-2 items-center">
      <Tooltip delayDuration={1000}>
        <TooltipTrigger>
          <Badge
            variant="outline"
            data-testid={`selection-toggle-${sel.id}`}
          >{pageDisplay}</Badge>
        </TooltipTrigger>
        <TooltipContent>Selection applies to {isGlobal ? "all pages" : `page ${sel.page_number + 1}`}</TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={1000}>
        <TooltipTrigger>
          <Save
            size="1.5em"
            className={isSaved ? "text-emerald-600" : "text-amber-500"}
          />
        </TooltipTrigger>
        <TooltipContent>{isSaved ? "Saved" : "Unsaved"}</TooltipContent>
      </Tooltip>

      {isCommitted && (
        <Tooltip delayDuration={1000}>
          <TooltipTrigger>
            <CheckCheck
              size="1.5em"
              className="text-emerald-600"
            />
          </TooltipTrigger>
          <TooltipContent>Committed</TooltipContent>
        </Tooltip>)
      }


      {isTemplate && (
        <Tooltip delayDuration={1000}>
          <TooltipTrigger>
            <Telescope
              size="1.5em"
              className="text-blue-600"
            />
          </TooltipTrigger>
          <TooltipContent>Template selection</TooltipContent>
        </Tooltip>
      )}

      {isAI && (
        <Tooltip delayDuration={1000}>
          <TooltipTrigger>
            <Bot
              aria-label={`AI confidence (AIC) ${confidence}`}
              size="1.5em"
              className={cn(
                typeof confidence === "number"
                  ? (confidence > 0.9 ? "text-emerald-600" : confidence > 0.7 ? "text-amber-500" : "text-red-600")
                  : undefined
              )}
            />
          </TooltipTrigger>
          <TooltipContent>{`AI confidence (AIC) ${confidence}`}</TooltipContent>
        </Tooltip>
      )}

      {menu}
    </div>
  );
}

function SelectionItemMenu({
  sel,
  norm,
  isProjectScopedDocument,
  onToggleScope,
  onOpenConfigDialog,
  onOpenConvertDialog,
  onConvertDeletionToEdition,
  onDelete,
}: {
  sel: any;
  norm: string;
  isProjectScopedDocument: boolean;
  onToggleScope: (id: string) => void;
  onOpenConfigDialog: (id: string) => void;
  onOpenConvertDialog: (id: string) => void;
  onConvertDeletionToEdition: (id: string) => Promise<boolean> | void;
  onDelete: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sx"
          variant="secondary"
          className="opacity-0 group-hover:opacity-100 transition-all duration-200"
          title="Row actions"
          aria-label="Row actions"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        <DropdownMenuItem
          disabled={!isProjectScopedDocument || norm === 'committed' || norm === 'staged_deletion'}
          onClick={(e) => { e.stopPropagation(); onToggleScope(sel.id); }}
        >
          <Telescope /> Toggle scope (project/document)
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            if (norm === 'committed' || norm === 'staged_deletion') {
              onOpenConvertDialog(sel.id);
            } else {
              onOpenConfigDialog(sel.id);
            }
          }}
        >
          <Settings /> Configure selection…
        </DropdownMenuItem>

        {norm === 'staged_deletion' && (
          <DropdownMenuItem
            onClick={async (e) => { e.stopPropagation(); await onConvertDeletionToEdition(sel.id); }}
          >
            <RotateCcw /> Convert deletion to edition
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(sel.id); }}
        >
          <Trash2 /> Delete selection
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SelectionItem({
  sel,
  isSelected,
  isProjectScopedDocument,
  setItemRef,
  onSelect,
  onToggleGlobal,
  onToggleScope,
  onOpenConfigDialog,
  onOpenConvertDialog,
  onConvertDeletionToEdition,
  onDelete,
}: {
  sel: any;
  isSelected: boolean;
  isProjectScopedDocument: boolean;
  setItemRef: (id: string, el: HTMLDivElement | null) => void;
  onSelect: (id: string) => void;
  onToggleGlobal: (id: string, e: React.MouseEvent) => void;
  onToggleScope: (sel: any) => void;
  onOpenConfigDialog: (id: string) => void;
  onOpenConvertDialog: (id: string) => void;
  onConvertDeletionToEdition: (id: string) => Promise<boolean> | void;
  onDelete: (id: string) => void;
}) {
  const { norm, pageDisplay, statusIndicator } = computeSelectionItemState(sel);
  const menu = (
    <SelectionItemMenu
      sel={sel}
      norm={norm}
      isProjectScopedDocument={isProjectScopedDocument}
      onToggleScope={() => onToggleScope(sel)}
      onOpenConfigDialog={onOpenConfigDialog}
      onOpenConvertDialog={onOpenConvertDialog}
      onConvertDeletionToEdition={onConvertDeletionToEdition}
      onDelete={onDelete}
    />
  )

  return (
    <div
      key={sel.displayId}
      ref={(el) => { setItemRef(sel.id, el); }}
      className={cn(
        "relative space-y-2",
        "group p-4 text-xs cursor-pointer focus:outline-none focus:ring-0",
        "border-l-2 border-transparent",
        "bg-muted/30",
        "transition-all duration-200",
        "hover:border-l-muted-foreground/30 hover:bg-muted/30",
        "focus:border-l-primary/50 focus:bg-muted/70",
        isSelected && "border-l-2 border-l-primary bg-primary/5"
      )}
      onClick={() => onSelect(sel.id)}
      tabIndex={0}
      >
      <SelectionItemCoord
        sel={sel}
      />

      <SelectionItemInfo
        sel={sel}
        statusIndicator={statusIndicator}
        pageDisplay={pageDisplay}
        onToggleGlobal={onToggleGlobal}
        menu={menu}
      />
    </div>
  );
}

export default function SelectionsListing() {
  const {
    selectedSelection,
    selectSelection,
    deleteSelection,
    setSelectionPage,
    setOnSelectionDoubleClick,
    convertSelectionToStagedEdition,
    uiSelections,
    toggleSelectionScope,
  } = useSelections();

  const { setCurrentPage, currentPage, numPages, setActiveControlsPanel } = useViewportState();
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
    const ui = (uiSelections || []);
    return ui.map((sel) => {
      const isModified = sel.isDirty;
      const isSaved = sel.isSaved;
      const isCommitted = sel.stage === "committed";
      const isGlobal = typeof sel.page_number !== "number";
      const isTemplate = sel.scope === "project";
      const isAiGenerated = typeof sel.confidence === "number";
      const confidence = sel.confidence;
      return { ...sel, isModified, isSaved, isCommitted, isGlobal, isTemplate, isAiGenerated, confidence, displayId: sel.id };
    });
  }, [uiSelections]);

  // Group selections by type for better organization
  // Filter: optionally hide AI-generated selections
  type FilterMode = 'all' | 'ai' | 'paged' | 'global' | 'template';
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const filteredSelections = useMemo(() => {
    switch (filterMode) {
      case 'ai':
        return selectionsWithTypeInfo.filter(sel => sel.isAiGenerated);
      case 'paged':
          return selectionsWithTypeInfo.filter(sel => !sel.isGlobal);
      case 'global':
        return selectionsWithTypeInfo.filter(sel => sel.isGlobal);
      case 'template':
        return selectionsWithTypeInfo.filter(sel => sel.isTemplate);
      default:
        return selectionsWithTypeInfo;
    }
  }, [selectionsWithTypeInfo, filterMode]);

  const groupedSelections = useMemo(() => {
    const saved = filteredSelections.filter(sel => sel.isSaved);
    const newOnes = filteredSelections.filter(sel => !sel.isSaved);
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
    const norm = getNormalizedSelectionState((selection as any)?.state);
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
    const norm = getNormalizedSelectionState((selection as any).state);
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

  // Render one selection via component
  const setItemRef = (id: string, el: HTMLDivElement | null) => { itemRefs.current[id] = el; };

  if (selectionsWithTypeInfo.length === 0) {
    return (
      <div className="flex flex-col gap-2 items-center p-4 m-4 text-xs text-muted-foreground text-center border border-dashed rounded-md">
        <SquareDashed className="h-8 w-8 mb-2" />
        <span className="font-medium text-sm">No selections yet</span>
        <span>Click and drag to create selections</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center gap-2 p-4 pb-0 ">
        <SquareDashed size="1.2rem" />
        <div className="font-medium truncate">Selections</div>
        <Button
          variant="secondary"
          size="sx"
          className="ml-auto"
          aria-label="Close Workbench"
          title="Close Workbench"
          onClick={() => setActiveControlsPanel('document-controls')}
        >
          <X />
        </Button>
      </div>

      <Separator />
      
      {/* Filter controls */}
      <div className="flex flex-0 items-center justify-between px-4">
        <div className="text-xs text-muted-foreground">
          {filteredSelections.length} of {selectionsWithTypeInfo.length}
        </div>
        <Select value={filterMode} onValueChange={(v) => setFilterMode(v as any)}>
          <SelectTrigger size="sm" className="text-xs">
            <SelectValue placeholder="All selections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All selections</SelectItem>
            <SelectItem value="ai">AI-generated</SelectItem>
            <SelectItem value="paged">Paged selections</SelectItem>
            <SelectItem value="global">Global selections</SelectItem>
            <SelectItem value="template">template selections</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        <div className="space-y-2">
          {/* Show all selections in order: new first, then saved */}
          {[...groupedSelections.new, ...groupedSelections.saved].map((sel) => (
            <SelectionItem
              key={sel.displayId}
              sel={sel}
              isSelected={selectedSelection?.id === sel.id}
              isProjectScopedDocument={isProjectScopedDocument}
              setItemRef={setItemRef}
              onSelect={handleSelectSelection}
              onToggleGlobal={handleToggleGlobal}
              onToggleScope={(targetSel: any) => {
                const { norm } = computeSelectionItemState(targetSel);
                if (!isProjectScopedDocument || norm === 'committed' || norm === 'staged_deletion') return;
                toggleSelectionScope(targetSel.id);
              }}
              onOpenConfigDialog={(id) => setDialogState({ isOpen: true, selectionId: id })}
              onOpenConvertDialog={(id) => setConvertDialog({ open: true, selectionId: id })}
              onConvertDeletionToEdition={convertSelectionToStagedEdition}
              onDelete={handleRemoveSelection}
            />
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
    </div>
  );
}
