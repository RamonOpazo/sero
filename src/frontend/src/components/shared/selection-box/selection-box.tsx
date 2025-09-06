import React from "react";
import { cn } from "@/lib/utils";

import { type BackgroundVariantName, SelectionBackground } from "./selection-backgrounds";

// Visual states supported explicitly
export type SelectionBoxState =
  | "unstaged"
  | "staged_creation"
  | "staged_edition"
  | "staged_deletion"
  | "committed";

export type SelectionBoxFlag =
  | "dirty"
  | "global"
  | "template";

export type cornerName =
  | "nw"
  | "ne"
  | "sw"
  | "se";

interface SelectionBoxVisual {
  color?: string
  border?: string
  background?: BackgroundVariantName
}

interface SelectionBoxStateVisual {
  unstaged?: SelectionBoxVisual
  staged_creation?: SelectionBoxVisual
  staged_edition?: SelectionBoxVisual
  staged_deletion?: SelectionBoxVisual
  committed?: SelectionBoxVisual
}

interface SelectionBoxFlagVisual {
  dirty?: SelectionBoxVisual
  global?: SelectionBoxVisual
  template?: SelectionBoxVisual
}

// Mapping types
export type SelectionBoxStateVisualMapping = Record<SelectionBoxState, SelectionBoxVisual>; // text-* color classes
export type SelectionBoxFlagVisualMapping = Record<SelectionBoxFlag, SelectionBoxVisual>; // text-* color classes

export interface SelectionBoxProps {
  id?: string;
  left: number;
  top: number;
  width: number;
  height: number;

  state: SelectionBoxState;

  isDirty: boolean;
  isGlobal: boolean;
  isTemplate: boolean;

  defaultVisual?: Required<SelectionBoxVisual>;
  stateVisuals?: SelectionBoxStateVisual;
  flagVisuals?: SelectionBoxFlagVisual;
  flagPriority?: SelectionBoxFlag[];

  isHovered?: boolean;
  isSelected?: boolean;

  // Visual behavior controls
  activityContrast?: number; // 0..1
  handlerSize?: number; // corner handle size in px

  // Interactivity
  interactive?: boolean;

  // Events
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onResizeStart?: (corner: cornerName, e: React.MouseEvent<HTMLDivElement>) => void;
}

const DEFAULT_VISUAL: Required<SelectionBoxVisual> = { color: "text-blue-600 border-blue-600/50 hover:border-blue-600", border: "border border-solid", background: "stripes" }

const DEFAULT_STATE_VISUALS: SelectionBoxStateVisualMapping = {
  unstaged: {},
  staged_creation: {},
  staged_edition: { color: "text-emerald-600 border-emerald-600 hover:border-emerald-600" },
  staged_deletion: { color: "text-red-600 border-red-600 hover:border-red-600" },
  committed: { color: "text-zinc-600 border-zinc-600 hover:border-zinc-600", background: "crosses" },
};

const DEFAULT_FLAG_VISUALS: SelectionBoxFlagVisualMapping = {
  dirty: { border: "border border-dashed" },
  global: { color: "text-amber-600 border-amber-600/50 hover:border-amber-600" },
  template: { border: "border-double border-4" },
}

const DEFAULT_FLAG_PRIORITY: SelectionBoxFlag[] = ["dirty", "global", "template"]

/**
 * SelectionBox - A declarative selection renderer with strong defaults
 *
 * Renders a selection rectangle with overlays, hover/selected contrast, boolean indicators,
 * and optional corner resize handles.
 */
export function SelectionBox(props: SelectionBoxProps) {
  const {
    id,
    left,
    top,
    width,
    height,
    state,
    isDirty = false,
    isGlobal = false,
    isTemplate = false,
    defaultVisual = DEFAULT_VISUAL,
    stateVisuals = DEFAULT_STATE_VISUALS,
    flagVisuals = DEFAULT_FLAG_VISUALS,
    flagPriority = DEFAULT_FLAG_PRIORITY,
    isHovered = false,
    isSelected = false,
    activityContrast = 0.6,
    handlerSize = 8,
    interactive = true,
    onClick,
    onMouseDown,
    onResizeStart,
    // style,
  } = props;

  const resolveVisualField = <K extends keyof SelectionBoxVisual>(
    field: K,
    stateVisual: SelectionBoxVisual | undefined,
    flagVisuals: SelectionBoxFlagVisual, // allow optional values
    flags: Record<SelectionBoxFlag, boolean>,
    priority: SelectionBoxFlag[],
    defaultVisual: Required<SelectionBoxVisual>
  ): SelectionBoxVisual[K] => {
    const base = stateVisual?.[field] ?? defaultVisual[field];
  
    return priority.reduce<SelectionBoxVisual[K]>(
      (current, key) => (flags[key] ? flagVisuals[key]?.[field] ?? current : current),
      base
    );
  }; 

  const flags: Record<SelectionBoxFlag, boolean> = {
    dirty: isDirty,
    global: isGlobal,
    template: isTemplate
  }

  const unifiedVisual: Required<SelectionBoxVisual> = (["color", "border", "background"] as const).reduce(
    (acc, field) => ({
      ...acc,
      [field]: resolveVisualField(field, stateVisuals[state], flagVisuals, flags, flagPriority, defaultVisual),
    }),
    {} as Required<SelectionBoxVisual>
  );

  const className = cn(
    unifiedVisual.color,
    unifiedVisual.border,
  )

  const active = isHovered || isSelected;
  const contrast = active ? 1 : activityContrast;

  // Corner handles positions
  const handlePositions: { corner: cornerName; style: React.CSSProperties }[] = [
    { corner: "nw", style: { top: -handlerSize / 2, left: -handlerSize / 2, cursor: "nw-resize" } },
    { corner: "ne", style: { top: -handlerSize / 2, right: -handlerSize / 2, cursor: "ne-resize" } },
    { corner: "sw", style: { bottom: -handlerSize / 2, left: -handlerSize / 2, cursor: "sw-resize" } },
    { corner: "se", style: { bottom: -handlerSize / 2, right: -handlerSize / 2, cursor: "se-resize" } },
  ];

  return (
    <div
      id={id}
      data-selection-id={id}
      className={cn(
        "absolute group overflow-visible",
        interactive ? "pointer-events-auto" : "pointer-events-none",
        className,
      )}
      style={{ left, top, width, height, }}
      onClick={interactive ? onClick : undefined}
      onMouseDown={interactive ? onMouseDown : undefined}
    >
      {/* Background preset */}
      <SelectionBackground
        variant={unifiedVisual.background}
        contrast={contrast}
      />

      {/* Resize handles when selected */}
      {interactive && active && state !== "committed" && state !== "staged_deletion" && (
        <SelectionBoxHandlers
          color="bg-blue-600 hover:bg-blue-700"
          border="border border-white"
          size={handlerSize}
          positions={handlePositions}
          callback={onResizeStart}
        />
      )}
    </div>
  );
}

export interface SelectionBoxHandlersProps {
  color: string;
  border: string;
  size: number;
  positions: { corner: cornerName; style: React.CSSProperties }[];
  callback?: ((corner: cornerName, event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void)
}

export function SelectionBoxHandlers(props: SelectionBoxHandlersProps) {
  const { color, border, size, callback, positions } = props;
  return (
    <>
      {positions.map(({ corner: corner, style: style }) => (
        <div
          key={corner}
          data-testid={`resize-${corner}`}
          className={`absolute ${color} ${border} transition-colors z-10`}
          style={{ width: size, height: size, ...style }}
          onMouseDown={(event) => callback && callback(corner, event)}
        />
      ))}
    </>
  )
}

export default SelectionBox;
