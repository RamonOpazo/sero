import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Scan, Info, Pen, PenOff, ChevronLeft, ChevronRight, Eye, EyeClosed, MousePointerClick, Bot } from "lucide-react";
import { useViewportState, useViewportActions } from '../providers/viewport-provider';
import type { MinimalDocumentType } from "@/types";
import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem, MenubarSeparator, MenubarSub, MenubarSubTrigger, MenubarSubContent, MenubarLabel, MenubarShortcut } from "@/components/ui/menubar";
import { TypedConfirmationDialog } from "@/components/shared/typed-confirmation-dialog";
import type { TypedMessage } from "@/components/shared/typed-confirmation-dialog";
import { useSelections } from "../providers/selections-provider";
import { useStageCommit } from "../hooks/use-stage-commit";
import { toast } from "sonner";
import { SimpleConfirmationDialog } from "@/components/shared/simple-confirmation-dialog/simple-confirmation-dialog";
import { FormConfirmationDialog } from "@/components/shared";
import { usePrompts } from "../providers/prompts-provider";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useDocumentActions } from "../hooks/use-document-actions";
import { DocumentViewerAPI } from "@/lib/document-viewer-api";
import { buildActionsMenuConfig, type MenuItem, type MenuNode } from "../core/configs/actions-config";
import { useZoomControls } from "../hooks/use-zoom-controls";

interface ActionsLayerProps {
  document: MinimalDocumentType;
  isInfoVisible?: boolean;
  onToggleInfo?: () => void;
}

export default function ActionsLayer({ document, isInfoVisible = false, onToggleInfo }: ActionsLayerProps) {
  const {
    currentPage,
    numPages,
    mode,
    setCurrentPage,
    setMode,
    showSelections,
    dispatch,
    isViewingProcessedDocument,
    activeWorkbenchTab,
    setActiveWorkbenchTab,
  } = useViewportState();

  const {
    toggleSelections,
    resetView,
  } = useViewportActions();

  // Selection and lifecycle hooks
  const { uiSelections, allSelections, undo, redo, canUndo, canRedo } = useSelections() as any;
  const {
    selectionStats: scSel,
    promptStats: prSel,
    canStage,
    canCommit,
    isStaging,
    isCommitting,
    stageAll,
    commitAll,
    clearSelections,
    stageMessages,
  } = useStageCommit(document.id) as any;

  // Prompts and AI hooks
  const { load, save, createPrompt } = usePrompts() as any;
  const actions = useDocumentActions(document);

  // Dialog state
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [commitAutoStage, setCommitAutoStage] = useState(false);
  const [showClearPageDialog, setShowClearPageDialog] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [showAddPromptDialog, setShowAddPromptDialog] = useState(false);
  const [showClearAllPromptsDialog, setShowClearAllPromptsDialog] = useState(false);

  // Compatibility function for setShowSelections
  const setShowSelections = (show: boolean) => {
    dispatch({ type: 'SET_SHOW_SELECTIONS', payload: show });
  };

  const handleModeToggle = () => {
    if (mode === "pan") {
      setMode("select");
      setShowSelections(true);
    } else {
      setMode("pan");
      setShowSelections(false);
    }
  };

  const handleResetView = () => {
    resetView();
    setMode("pan");
  }

  // Zoom controls
  const { zoomIn, zoomOut } = useZoomControls();
  const handleZoomIn = useCallback(() => { zoomIn(); }, [zoomIn]);
  const handleZoomOut = useCallback(() => { zoomOut(); }, [zoomOut]);

  // State for auto-hide behavior
  const [visible, setVisible] = useState(false); // Start hidden, show on hover

  // Handle mouse enter/leave in render layer to show/hide UI based on hover
  useEffect(() => {
    const handleRenderLayerMouseEnter = () => {
      setVisible(true);
    };

    const handleRenderLayerMouseLeave = () => {
      setVisible(false);
    };

    // Find the render layer element and add mouse enter/leave listeners
    const renderLayer = globalThis.document.querySelector('[data-slot="document-viewer-renderer"]');
    if (renderLayer) {
      renderLayer.addEventListener('mouseenter', handleRenderLayerMouseEnter);
      renderLayer.addEventListener('mouseleave', handleRenderLayerMouseLeave);

      return () => {
        renderLayer.removeEventListener('mouseenter', handleRenderLayerMouseEnter);
        renderLayer.removeEventListener('mouseleave', handleRenderLayerMouseLeave);
      };
    }

    return () => {};
  }, []);

  return (
    <div id="__actions_layer__" className="w-fit">

      {/* Main Control Bar - Center (Top) */}
      <div className={cn(
        "absolute top-2 left-1/2 -translate-x-1/2 z-1001 transition-all duration-300 ease-in-out",
        "flex flex-row gap-0",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none",
      )}>
        <Menubar>
          {(() => {
            const ctx = {
              view: {
                zoomIn: handleZoomIn,
                zoomOut: handleZoomOut,
                resetView: handleResetView,
                toggleMode: handleModeToggle,
                toggleSelections,
                toggleProcessedView: actions.toggleProcessedView,
                viewOriginal: actions.viewOriginal,
                viewRedacted: actions.viewRedacted,
                gotoPrevPage: actions.gotoPrevPage,
                gotoNextPage: actions.gotoNextPage,
                onToggleInfo,
                isInfoVisible,
                showSelections,
                mode,
                activeWorkbenchTab,
                toggleWorkbenchTab: () => setActiveWorkbenchTab(activeWorkbenchTab === 'selections' ? 'prompts' : 'selections'),
              },
              selections: {
                openCommitDialog: () => setShowCommitDialog(true),
                openStageDialog: () => setShowStageDialog(true),
                discardAllUnsaved: actions.discardAllUnsaved,
                openClearPageDialog: () => setShowClearPageDialog(true),
                openClearAllDialog: () => setShowClearAllDialog(true),
                openWorkbenchSelections: actions.openWorkbenchSelections,
                canStage,
                canCommit,
                isStaging,
                isCommitting,
                clearPageDisabled: allSelections.filter((s: any) => s.page_number === currentPage).length === 0,
                clearAllDisabled: (allSelections || []).length === 0,
                undo,
                redo,
                canUndo,
                canRedo,
              },
              rules: {
                runAi: actions.runAi,
                isApplyingAI: actions.isApplyingAI,
                openAddRuleDialog: () => setShowAddPromptDialog(true),
                openClearAllRulesDialog: () => setShowClearAllPromptsDialog(true),
                openWorkbenchPrompts: actions.openWorkbenchPrompts,
              },
              document: {
                processDocument: actions.processDocument,
                isProcessingDoc: actions.isProcessingDoc,
                downloadCurrentView: actions.downloadCurrentView,
                isDownloadAvailable: actions.isDownloadAvailable,
              },
            } as const;
            const menus = buildActionsMenuConfig(ctx);

            const renderNode = (c: MenuNode): React.ReactNode => {
              if (c.type === 'separator') return <MenubarSeparator key={c.key} />;
              if (c.type === 'label') return <MenubarLabel key={c.key}>{c.label}</MenubarLabel>;
              if (c.type === 'submenu') {
                return (
                  <MenubarSub key={c.key}>
                    <MenubarSubTrigger>{c.label}</MenubarSubTrigger>
                    <MenubarSubContent>
                      {c.children.map(renderNode)}
                    </MenubarSubContent>
                  </MenubarSub>
                );
              }
              const item = c as MenuItem;
              const Icon = item.icon;
              return (
                <MenubarItem key={item.key} onClick={item.onSelect} disabled={item.disabled}>
                  {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
                  {item.label}
                  {item.shortcut ? <MenubarShortcut>{item.shortcut}</MenubarShortcut> : null}
                </MenubarItem>
              );
            };

            return menus.map((menu) => (
              <MenubarMenu key={menu.key}>
                <MenubarTrigger>{menu.title}</MenubarTrigger>
                <MenubarContent align={menu.align ?? 'start'}>
                  {menu.entries.map(renderNode)}
                </MenubarContent>
              </MenubarMenu>
            ));
          })()}

          <Separator orientation="vertical" />

          <div className="flex flex-row gap-0">
            <Button variant="ghost" size="icon" onClick={handleZoomOut}><ZoomOut /></Button>
            <Button variant="ghost" size="icon" onClick={handleZoomIn}><ZoomIn /></Button>
            <Button variant="ghost" size="icon" onClick={handleResetView}><Scan /></Button>
            <Button variant="ghost" size="icon" onClick={toggleSelections} title={showSelections ? "Hide selections" : "Show selections"}>{showSelections ? <Pen /> : <PenOff />}</Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveWorkbenchTab(activeWorkbenchTab === 'selections' ? 'prompts' : 'selections')}
              title={activeWorkbenchTab === 'selections' ? 'Open AI Rules' : 'Open Selections'}
            >
              {activeWorkbenchTab === 'selections' ? <MousePointerClick /> : <Bot />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={actions.toggleProcessedView}
              title={isViewingProcessedDocument ? "View original" : "View redacted"}
            >
              {isViewingProcessedDocument ? <EyeClosed /> : <Eye />}
            </Button>
            {onToggleInfo && (
              <Button variant="ghost" size="icon" onClick={onToggleInfo} className={isInfoVisible ? 'bg-accent text-accent-foreground' : ''} title="Toggle info"><Info /></Button>
            )}
          </div>

        </Menubar>
      </div>

      {/* Bottom mini-pager (visible on hover) */}
      <div className={cn(
        "absolute bottom-2 left-1/2 -translate-x-1/2 z-1001 bg-background/90 rounded-md",
        "transition-all duration-300 ease-in-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
      )}>
        <MiniPager
          currentPage={currentPage}
          numPages={numPages}
          onPrev={() => setCurrentPage(currentPage - 1)}
          onNext={() => setCurrentPage(currentPage + 1)}
        />
      </div>

      {/* Dialogs for selections actions */}
      <TypedConfirmationDialog
        isOpen={showStageDialog}
        onClose={() => setShowStageDialog(false)}
        onConfirm={async () => { setShowStageDialog(false); await stageAll(); }}
        title="Stage all changes"
        description="This will stage all pending selections and prompt changes for this document."
        confirmationText="stage"
        confirmButtonText="Stage all"
        cancelButtonText="Cancel"
        variant="default"
        messages={stageMessages}
      />

      <TypedConfirmationDialog
        isOpen={showCommitDialog}
        onClose={() => setShowCommitDialog(false)}
        onConfirm={async () => { setShowCommitDialog(false); await commitAll(commitAutoStage); setCommitAutoStage(false); }}
        title="Commit all staged"
        description={undefined}
        confirmationText="commit"
        confirmButtonText="Commit"
        cancelButtonText="Cancel"
        variant="default"
        messages={(() => {
          const totalToCommit = (scSel.stagedPersisted + scSel.created + scSel.updated) + (prSel.stagedPersisted + prSel.created + prSel.updated);
          const msgs: TypedMessage[] = totalToCommit === 0
            ? [{ variant: 'warning', title: 'Nothing to commit', description: 'There are no changes to commit.' }]
            : [
              { variant: 'warning', title: 'Irreversible operation', description: 'Once committed, changes cannot be undone from here.' },
              ...(scSel.stagedPersisted + scSel.created + scSel.updated > 0 ? [{ variant: 'info', title: 'Selections to commit', description: `${scSel.stagedPersisted + scSel.created + scSel.updated} selection change(s) will be committed` }] : [] as any),
              ...(prSel.stagedPersisted + prSel.created + prSel.updated > 0 ? [{ variant: 'info', title: 'Prompts to commit', description: `${prSel.stagedPersisted + prSel.created + prSel.updated} prompt change(s) will be committed` }] : [] as any),
            ];
          const autoMsg: TypedMessage = commitAutoStage
            ? { variant: 'warning', title: 'Auto-stage is ON', description: 'Pending changes will be staged and committed in one step.' }
            : { variant: 'info', title: 'Optional: auto-stage before commit', description: 'If enabled, any unstaged changes will be staged first, then committed.' };
          return [...msgs, autoMsg];
        })()}
        formFields={[
          (
            <div key="autostage" className="flex items-center justify-between text-xs p-2 border rounded">
              <div className="flex flex-col">
                <span className="font-medium">Auto-stage before commit</span>
                <span className="text-muted-foreground">Stage pending changes first, then commit</span>
              </div>
              {/* Simple checkbox using button toggle to avoid extra imports */}
              <Button variant={commitAutoStage ? 'default' : 'outline'} size="sm" onClick={() => setCommitAutoStage(v => !v)}>{commitAutoStage ? 'ON' : 'OFF'}</Button>
            </div>
          )
        ]}
      />

      {/* Clear page */}
      <TypedConfirmationDialog
        isOpen={showClearPageDialog}
        onClose={() => setShowClearPageDialog(false)}
        onConfirm={async () => {
          setShowClearPageDialog(false);
          const { persistedCount, draftCount } = await clearSelections(currentPage);
          toast.success(`Staged edition then deletion for ${persistedCount} committed selection${persistedCount === 1 ? '' : 's'} and removed ${draftCount} draft${draftCount === 1 ? '' : 's'} on page ${currentPage + 1}`);
        }}
        title={`Clear page ${currentPage + 1}`}
        confirmationText="stage"
        confirmButtonText="Stage deletions"
        cancelButtonText="Cancel"
        variant="destructive"
        messages={(() => {
          const pageSelections = (uiSelections || []).filter((sel: any) => sel.page_number === currentPage);
          const persistedCount = pageSelections.filter((s: any) => s.isPersisted).length;
          const draftCount = pageSelections.length - persistedCount;
          return [
            { variant: 'warning', title: 'Committed selections will be staged_deletion', description: 'Committed selections will be converted to staged_deletion and will require a Commit to be permanently removed.' },
            { variant: 'warning', title: 'Draft selections will be removed', description: 'Draft (unsaved) selections will be removed immediately and will not be staged.' },
            { variant: 'info', title: 'Scope', description: `Page ${currentPage + 1}: ${persistedCount} committed → staged_deletion, ${draftCount} drafts → removed.` },
          ] as TypedMessage[];
        })()}
      />

      {/* Clear all */}
      <TypedConfirmationDialog
        isOpen={showClearAllDialog}
        onClose={() => setShowClearAllDialog(false)}
        onConfirm={async () => {
          setShowClearAllDialog(false);
          const { persistedCount, draftCount } = await clearSelections(undefined);
          toast.success(`Staged edition then deletion for ${persistedCount} committed selection${persistedCount === 1 ? '' : 's'} and removed ${draftCount} draft${draftCount === 1 ? '' : 's'} across all pages`);
        }}
        title="Clear all selections"
        confirmationText="stage"
        confirmButtonText="Stage deletions"
        cancelButtonText="Cancel"
        variant="destructive"
        messages={(() => {
          const total = (uiSelections || []).length;
          const persistedCount = (uiSelections || []).filter((s: any) => s.isPersisted).length;
          const draftCount = total - persistedCount;
          return [
            { variant: 'warning', title: 'Committed selections will be staged_deletion', description: 'Committed selections will be converted to staged_deletion and will require a Commit to be permanently removed.' },
            { variant: 'warning', title: 'Draft selections will be removed', description: 'Draft (unsaved) selections will be removed immediately and will not be staged.' },
            { variant: 'error', title: 'Destructive operation', description: `This will affect all pages: ${persistedCount} committed → staged_deletion, ${draftCount} drafts → removed.` },
          ] as TypedMessage[];
        })()}
      />

      {/* Add Prompt Dialog */}
      <FormConfirmationDialog
        isOpen={showAddPromptDialog}
        onClose={() => setShowAddPromptDialog(false)}
        title="Create AI Rule"
        description="Fill in the prompt details. The rule will be created and immediately committed."
        confirmButtonText="Create rule"
        cancelButtonText="Cancel"
        variant="default"
        messages={[]}
        initialValues={{ title: '', directive: 'process', prompt: '' }}
        fields={[
          { type: 'text', name: 'title', label: 'Title', placeholder: 'Short descriptive title', required: true },
          {
            type: 'select', name: 'directive', label: 'Directive', placeholder: 'Select directive', required: true,
            options: [
              { value: 'process', label: 'Process' },
              { value: 'identify', label: 'Identify' },
              { value: 'redact', label: 'Redact' },
              { value: 'preserve', label: 'Preserve' },
              { value: 'exclude', label: 'Exclude' },
            ],
          },
          { type: 'textarea', name: 'prompt', label: 'Prompt', placeholder: 'Detailed instructions for the AI', required: true },
        ]}
        onSubmit={async (values: Record<string, any>) => {
          const title = String(values.title ?? '').trim();
          const directive = String(values.directive ?? '').trim();
          const promptBody = String(values.prompt ?? '').trim();
          if (!title || !promptBody || !directive) {
            toast.error('Please fill in title, directive, and prompt');
            throw new Error('validation');
          }
          createPrompt({ title, directive, prompt: promptBody, state: 'committed', scope: 'document' } as any);
          const res = await save();
          if (!res.ok) { toast.error('Failed to create prompt'); throw new Error('api'); }
          toast.success(`${title} rule created and committed`);
          setShowAddPromptDialog(false);
        }}
      />

      {/* Clear all prompts */}
      <SimpleConfirmationDialog
        isOpen={showClearAllPromptsDialog}
        onClose={() => setShowClearAllPromptsDialog(false)}
        onConfirm={async () => {
          try {
            const res = await DocumentViewerAPI.clearDocumentPrompts(document.id);
            if (res.ok) { await load(); toast.success('All rules cleared'); } else { throw new Error('api'); }
          } catch (e) { toast.error('Failed to clear all rules'); throw e; }
        }}
        title="Clear all rules"
        description={
          <div className="text-xs">
            <p className="mb-2">This will permanently delete all AI rules (prompts) for this document.</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>This action cannot be undone.</li>
              <li>All rules will be deleted immediately (no staging).</li>
            </ul>
          </div>
        }
        confirmButtonText="Delete all rules"
        cancelButtonText="Cancel"
        variant="destructive"
        messages={[{ variant: 'warning', title: 'Irreversible operation', description: 'All prompts will be permanently removed from this document.' }]}
      />
    </div>
  );
}

export interface MiniPagerProps {
  currentPage: number;
  numPages: number;
  onPrev: () => void;
  onNext: () => void;
}

export function MiniPager({ currentPage, numPages, onPrev, onNext }: MiniPagerProps) {
  const canPrev = currentPage > 0;
  const canNext = currentPage + 1 < numPages;

  return (
    <Menubar>
      <Button
        variant="ghost"
        size="icon"
        disabled={!canPrev}
        onClick={onPrev}
        title="Previous page"
      >
        <ChevronLeft />
      </Button>
      <span className="text-sm font-medium w-28 text-center">
        Page {Math.min(currentPage + 1, Math.max(numPages, 1))} of {Math.max(numPages, 1)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        disabled={!canNext}
        onClick={onNext}
        title="Next page"
      >
        <ChevronRight />
      </Button>
    </Menubar>
  );
}