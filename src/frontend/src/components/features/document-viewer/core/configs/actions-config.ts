import type React from "react";
import { ZoomIn, ZoomOut, Scan, MousePointerClick, Hand, Pen, PenOff, Info, ChevronLeft, ChevronRight, Bot, Save, CheckCheck, Eraser, Undo2, Redo2, FileX, Scissors, Download, Plus, Eye, EyeClosed, ArrowLeftRight } from "lucide-react";

// Icon component type (e.g., lucide-react icons)
export type IconComp = React.ComponentType<{ className?: string }>;

// Declarative menu node types
interface BaseNode {
  key: string;
  hidden?: boolean;
}

export interface MenuItem extends BaseNode {
  type: "item";
  label: string;
  icon?: IconComp;
  shortcut?: string;
  disabled?: boolean;
  onSelect?: () => void;
}

export interface MenuSeparator extends BaseNode {
  type: "separator";
}

export interface MenuLabel extends BaseNode {
  type: "label";
  label: string;
}

export interface MenuSubmenu extends BaseNode {
  type: "submenu";
  label: string;
  children: MenuNode[];
}

export type MenuNode = MenuItem | MenuSeparator | MenuLabel | MenuSubmenu;

export interface MenuConfig {
  key: string;
  title: string;
  entries: MenuNode[];
  align?: "start" | "end";
}

// Loose actions/state context for building the menu config. This will be
// refined in subsequent steps as we extract concrete action hooks.
export interface ActionsContext {
  view: {
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
    toggleMode: () => void;
    toggleSelections: () => void;
    toggleProcessedView: () => void;
    viewOriginal: () => void;
    viewRedacted: () => void;
    gotoPrevPage: () => void;
    gotoNextPage: () => void;
    onToggleInfo?: () => void;
    isInfoVisible?: boolean;
    showSelections: boolean;
    mode: 'pan' | 'select' | string;
    // Workbench tab
    activeWorkbenchTab: 'selections' | 'prompts';
    toggleWorkbenchTab: () => void;
  };
  selections: {
    openCommitDialog: () => void;
    openStageDialog: () => void;
    discardAllUnsaved: () => void;
    openClearPageDialog: () => void;
    openClearAllDialog: () => void;
    openWorkbenchSelections: () => void;
    canStage: boolean;
    canCommit: boolean;
    isStaging: boolean;
    isCommitting: boolean;
    clearPageDisabled: boolean;
    clearAllDisabled: boolean;
    // history
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
  };
  rules: {
    runAi: () => Promise<void> | void;
    isApplyingAI: boolean;
    openAddRuleDialog: () => void;
    openClearAllRulesDialog: () => void;
    openWorkbenchPrompts: () => void;
  };
  document: {
    processDocument: () => Promise<void> | void;
    isProcessingDoc: boolean;
    downloadCurrentView: () => void;
    isDownloadAvailable: boolean;
  };
}

// Factory to build the full ActionsLayer menu configuration
export function buildActionsMenuConfig(ctx: ActionsContext): MenuConfig[] {
  const { view, selections, rules, document } = ctx;

  const viewMenu: MenuConfig = {
    key: 'view',
    title: 'View',
    align: 'start',
    entries: [
      { type: 'label', key: 'zoomlabel', label: 'Zoom & Pan' },
      { type: 'item', key: 'zoomin', label: 'Zoom In', icon: ZoomIn, shortcut: 'Ctrl+=', onSelect: view.zoomIn },
      { type: 'item', key: 'zoomout', label: 'Zoom Out', icon: ZoomOut, shortcut: 'Ctrl+-', onSelect: view.zoomOut },
      { type: 'item', key: 'reset', label: 'Reset View', icon: Scan, shortcut: 'Ctrl+0', onSelect: view.resetView },
      {
        type: 'item', key: 'toggle-mode',
        label: view.mode === 'pan' ? 'Switch to Select' : 'Switch to Pan',
        icon: view.mode === 'pan' ? MousePointerClick : Hand,
        onSelect: view.toggleMode,
      },
      { type: 'separator', key: 'sep1' },
      {
        type: 'item', key: 'toggle-sel',
        label: view.showSelections ? 'Hide selections' : 'Show selections',
        icon: view.showSelections ? PenOff : Pen,
        shortcut: 'V',
        onSelect: view.toggleSelections,
      },
      ...(view.onToggleInfo ? [{
        type: 'item', key: 'toggle-info',
        label: view.isInfoVisible ? 'Hide info' : 'Show info',
        icon: Info,
        shortcut: 'I',
        onSelect: view.onToggleInfo,
      } as MenuItem] : []),
      { type: 'separator', key: 'sep2' },
      {
        type: 'submenu', key: 'page', label: 'Page',
        children: [
          { type: 'item', key: 'prev', label: 'Previous', icon: ChevronLeft, shortcut: 'Alt+Left', onSelect: view.gotoPrevPage },
          { type: 'item', key: 'next', label: 'Next', icon: ChevronRight, shortcut: 'Alt+Right', onSelect: view.gotoNextPage },
        ],
      },
      { type: 'separator', key: 'sep3' },
      {
        type: 'submenu', key: 'docview', label: 'Document View',
        children: [
          { type: 'item', key: 'view-original', label: 'Original', icon: Eye, onSelect: view.viewOriginal },
          { type: 'item', key: 'view-redacted', label: 'Redacted', icon: EyeClosed, onSelect: view.viewRedacted },
        ],
      },
      { type: 'separator', key: 'sep4' },
      {
        type: 'submenu', key: 'workbench', label: 'Workbench',
        children: [
          { type: 'item', key: 'wb-selections', label: 'Selections', icon: MousePointerClick, onSelect: selections.openWorkbenchSelections },
          { type: 'item', key: 'wb-prompts', label: 'AI Rules', icon: Bot, onSelect: rules.openWorkbenchPrompts },
        ],
      },
      {
        type: 'item', key: 'toggle-workbench',
        label: view.activeWorkbenchTab === 'selections' ? 'Switch to AI Rules' : 'Switch to Selections',
        icon: ArrowLeftRight,
        shortcut: 'Ctrl+Shift+W',
        onSelect: view.toggleWorkbenchTab,
      },
    ],
  };

  const selectionsMenu: MenuConfig = {
    key: 'selections',
    title: 'Selections',
    align: 'start',
    entries: [
      { type: 'item', key: 'undo', label: 'Undo', icon: Undo2, shortcut: 'Ctrl+Z', onSelect: selections.undo, disabled: !selections.canUndo },
      { type: 'item', key: 'redo', label: 'Redo', icon: Redo2, shortcut: 'Ctrl+Y', onSelect: selections.redo, disabled: !selections.canRedo },
      { type: 'separator', key: 'sep0' },
      { type: 'item', key: 'commit', label: selections.isCommitting ? 'Committing…' : 'Commit staged', icon: CheckCheck, shortcut: 'C', onSelect: selections.openCommitDialog, disabled: !selections.canCommit || selections.isCommitting },
      { type: 'item', key: 'stage', label: selections.isStaging ? 'Staging…' : 'Stage all changes', icon: Save, shortcut: 'S', onSelect: selections.openStageDialog, disabled: !selections.canStage || selections.isStaging },
      { type: 'item', key: 'discard', label: 'Discard all unsaved', icon: Eraser, onSelect: selections.discardAllUnsaved },
      { type: 'separator', key: 'sep1' },
      {
        type: 'submenu', key: 'clear', label: 'Clear',
        children: [
          { type: 'item', key: 'clear-page', label: 'Current page', icon: FileX, onSelect: selections.openClearPageDialog, disabled: selections.clearPageDisabled },
          { type: 'item', key: 'clear-all', label: 'All pages', icon: FileX, onSelect: selections.openClearAllDialog, disabled: selections.clearAllDisabled },
        ],
      },
      { type: 'separator', key: 'sep2' },
      { type: 'item', key: 'open-wb-sel', label: 'Open Workbench • Selections', onSelect: selections.openWorkbenchSelections },
    ],
  };

  const rulesMenu: MenuConfig = {
    key: 'rules',
    title: 'Rules',
    align: 'start',
    entries: [
      { type: 'item', key: 'run-ai', label: rules.isApplyingAI ? 'Running AI…' : 'Run AI detection', icon: Bot, onSelect: rules.runAi, disabled: rules.isApplyingAI, shortcut: 'Ctrl+Alt+A' },
      { type: 'item', key: 'add-rule', label: 'Add Rule…', icon: Plus, onSelect: rules.openAddRuleDialog, shortcut: 'Ctrl+N' },
      { type: 'item', key: 'clear-rules', label: 'Clear all rules…', icon: FileX, onSelect: rules.openClearAllRulesDialog, shortcut: 'Shift+Del' },
      { type: 'separator', key: 'sep1' },
      { type: 'item', key: 'open-wb-rules', label: 'Open Workbench • AI Rules', onSelect: rules.openWorkbenchPrompts },
    ],
  };

  const documentMenu: MenuConfig = {
    key: 'document',
    title: 'Document',
    align: 'start',
    entries: [
      { key: 'process', type: 'item', label: document.isProcessingDoc ? 'Processing…' : 'Process document', icon: Scissors, onSelect: document.processDocument, disabled: document.isProcessingDoc, shortcut: 'Ctrl+P' },
      { key: 'download', type: 'item', label: 'Download current view', icon: Download, onSelect: document.downloadCurrentView, disabled: !document.isDownloadAvailable, shortcut: 'Ctrl+D' },
    ],
  };

  return [viewMenu, selectionsMenu, rulesMenu, documentMenu];
}

