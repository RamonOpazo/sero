import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Trash2, MousePointer2, Globe, Hash, Settings, Telescope, Bot, RotateCcw, GitCommitVertical, GitPullRequestCreateArrow } from "lucide-react";
import { useSelections } from "../../providers/selections-provider";
import { useViewportState } from "../../providers/viewport-provider";
import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { FormConfirmationDialog } from "@/components/shared";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { TypedMessage } from "@/components/shared/typed-confirmation-dialog";
import { SimpleConfirmationDialog } from "@/components/shared/simple-confirmation-dialog";
import { CONVERT_TO_STAGED_DIALOG } from "./dialog-text";
import type { Selection } from "../../types/viewer";
import { getNormalizedSelectionState } from "../../utils";
import { useWorkspace } from "@/providers/workspace-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type StatusIndicator = { color: string; title: string; label: string };

const STATUS_META: Record<string, { color: string; title: string; label: string }> = {
  committed: { color: 'text-zinc-500', title: 'Committed', label: 'Committed' },
  staged_deletion: { color: 'text-red-500', title: 'Staged deletion', label: 'Deletion' },
  staged_edition: { color: 'text-violet-500', title: 'Staged edition', label: 'Edition' },
  staged_creation: { color: 'text-blue-500', title: 'Staged creation', label: 'Creation' },
  draft: { color: 'text-emerald-500', title: 'Unstaged (local)', label: 'Unstaged' },
};

function computeSelectionItemState(sel: any) {
  const isGlobal = sel.page_number === null;
  const norm = getNormalizedSelectionState((sel as any).state);
  const pageDisplay = isGlobal ? 'Global' : `Page ${(sel.page_number ?? 0) + 1}`;
  const isProjectScope = (sel as any).scope === 'project';
  const isModified = !!sel.dirty;

  const statusIndicator: StatusIndicator = (() => {
    if (sel.stage === 'staged_creation' || sel.stage === 'staged_edition' || sel.stage === 'staged_deletion' || sel.stage === 'committed') {
      const lab = STATUS_META[sel.stage] ?? STATUS_META.draft;
      return { color: lab.color, title: lab.title, label: lab.label };
    }
    if (!sel.isPersisted) return STATUS_META.draft;
    if (isModified) return { color: 'text-amber-500', title: 'Modified', label: 'Modified' };
    return { color: 'text-gray-400', title: 'Saved', label: 'Saved' };
  })();

  return { isGlobal, norm, pageDisplay, isProjectScope, statusIndicator } as const;
}

function SelectionItemInfo({
  sel,
  isProjectScope,
  statusIndicator,
  pageDisplay,
}: {
  sel: any;
  isProjectScope: boolean;
  statusIndicator: StatusIndicator;
  pageDisplay: string;
  onToggleGlobal: (id: string, e: React.MouseEvent) => void;
}) {
  const formatValue = (value: number): string => value.toFixed(2);
  const isAI = !!sel.is_ai_generated;
  const confidence = sel.confidence as number | null | undefined;
  const isGlobal = sel.page_number === null;

  return (
    <div className="flex flex-col py-2">
      <div className="text-xs mb-2">
        <span className="text-muted-foreground">Coords: </span>
        <span className="font-mono">{formatValue(sel.x)}, {formatValue(sel.y)} • {formatValue(sel.width)} × {formatValue(sel.height)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2  [&>*]:w-full [&>*]:justify-start">
        <Badge
          title="Selection page"
          variant="outline"
          icon={isGlobal ? Globe : Hash}
          data-testid={`selection-toggle-${sel.id}`}
        >{pageDisplay}</Badge>

        <Badge
          title={statusIndicator.title}
          variant="outline"
          icon={statusIndicator.label.toLowerCase() === "committed" ? GitCommitVertical : GitPullRequestCreateArrow}
          status="custom"
          customStatusColor={statusIndicator.color}
        >{statusIndicator.label}</Badge>

        <Badge
          title="Selection scope"
          variant="outline"
          icon={Telescope}
          status={isProjectScope ? "error" : "muted"}
          data-testid={`selection-scope-${sel.id}`}
        >{isProjectScope ? 'Project' : 'Document'}</Badge>

        {isAI && (
          <Badge
            title={`AI confidence (AIC) ${confidence}`}
            variant="outline"
            icon={Bot}
            status={
              typeof confidence === "number"
                ? (confidence > 0.9 ? "success" : confidence > 0.7 ? "warning" : "error")
                : undefined
            }
          >AIC {confidence}</Badge>
        )}
      </div>
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
  onConvertDeletionToEdition: (id: string) => Promise<void> | void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="absolute top-2 right-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:text-foreground hover:bg-muted/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
            title="Row actions"
            aria-label="Row actions"
          >
            <MoreVertical />
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
    </div>
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
  onConvertDeletionToEdition: (id: string) => Promise<void> | void;
  onDelete: (id: string) => void;
}) {
  const { norm, pageDisplay, isProjectScope, statusIndicator } = computeSelectionItemState(sel);
  return (
    <div
      key={sel.displayId}
      ref={(el) => { setItemRef(sel.id, el); }}
      className={cn(
        "relative",
        "group p-2 text-xs cursor-pointer focus:outline-none focus:ring-0",
        "border-l-2 border-transparent",
        "bg-muted/30",
        "transition-all duration-200",
        "hover:border-l-muted-foreground/30 hover:pl-3 hover:bg-muted/30",
        "focus:border-l-primary/50 focus:pl-3 focus:bg-muted/70",
        isSelected && "border-l-2 border-l-primary pl-5 bg-primary/5"
      )}
      onClick={() => onSelect(sel.id)}
      tabIndex={0}
    >
      <div>
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
        <SelectionItemInfo
          sel={sel}
          isProjectScope={isProjectScope}
          statusIndicator={statusIndicator}
          pageDisplay={pageDisplay}
          onToggleGlobal={onToggleGlobal}
        />
      </div>
    </div>
  );
}

export default function SelectionList() {
  const {
    selectedSelection,
    selectSelection,
    deleteSelection,
    setSelectionPage,
    setOnSelectionDoubleClick,
    convertSelectionToStagedEdition,
    uiSelections,
    toggleSelectionScope,
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
  // no-op placeholder retained for diff context

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
      <div className="flex items-center justify-between mb-2">
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

      <div className="flex-1 min-h-0 overflow-auto h-[80vh]">
        <div className="space-y-1">
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
    </>
  );
}
