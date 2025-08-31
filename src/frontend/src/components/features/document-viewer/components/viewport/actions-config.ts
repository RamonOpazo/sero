import type React from "react";

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
  actions: {
    processDocument: () => Promise<void> | void;
    isProcessingDoc: boolean;
    downloadCurrentView: () => void;
    isDownloadAvailable: boolean;
  };
}

// Factory to build the full ActionsLayer menu configuration
export function buildActionsMenuConfig(ctx: ActionsContext): MenuConfig[] {
  const { actions } = ctx;

  const documentMenu: MenuConfig = {
    key: 'document',
    title: 'Document',
    align: 'start',
    entries: [
      {
        key: 'process',
        type: 'item',
        label: actions.isProcessingDoc ? 'Processing…' : 'Process document',
        onSelect: actions.processDocument,
        disabled: actions.isProcessingDoc,
      },
      { key: 'sep1', type: 'separator' },
      {
        key: 'download',
        type: 'item',
        label: 'Download current view',
        onSelect: actions.downloadCurrentView,
        disabled: !actions.isDownloadAvailable,
      },
    ],
  };

  // For now, we only return the Document menu. Other menus will be added in subsequent steps.
  return [documentMenu];
}

