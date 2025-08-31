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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Factory to build the full ActionsLayer menu configuration
export function buildActionsMenuConfig(_ctx: ActionsContext): MenuConfig[] {
  // Step 1: scaffold. We'll populate entries in step 3 after extracting actions (step 2).
  return [];
}

