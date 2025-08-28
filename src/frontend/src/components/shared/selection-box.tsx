import React from "react";
import { cn } from "@/lib/utils";
import { type BackgroundVariantName, SelectionBackground } from "./selection-backgrounds";

// Visual states supported explicitly
export type SelectionVisualState =
  | "unstaged"
  | "staged_creation"
  | "staged_edition"
  | "staged_deletion"
  | "committed";

// Boolean flags we support for style overrides
export type SelectionBooleanFlag =
  | "off"
  | "dirty"
  | "global_page"
  | "project_scope";

export type cornerName = 
  | "nw"
  | "ne"
  | "sw"
  | "se"

// Mapping types
export type ColorMapping = Record<SelectionVisualState, string>; // text-* color classes
export type BorderMapping = Record<SelectionVisualState, string>; // border classes (including style)
export type BackgroundVariantMapping = Record<SelectionVisualState, BackgroundVariantName>; // choose a named background preset
export type FlagVariantMapping = Record<SelectionBooleanFlag, BackgroundVariantName | undefined>; // choose a named background preset

export interface SelectionBoxProps {
  id?: string;
  left: number;
  top: number;
  width: number;
  height: number;

  state: SelectionVisualState;
  flag: SelectionBooleanFlag;

  isHovered?: boolean;
  isSelected?: boolean;

  // Declarative mappings with good defaults
  colorMapping?: Partial<ColorMapping>;
  borderMapping?: Partial<BorderMapping>;
  backgroundVariantMapping?: Partial<BackgroundVariantMapping>;
  flagVariantMappings?: Partial<FlagVariantMapping>;

  // Visual behavior controls
  activityContrast?: number; // 0..1
  handlerSize?: number; // corner handle size in px

  // Events
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onResizeStart?: (corner: cornerName, e: React.MouseEvent<HTMLDivElement>) => void;

  // Misc
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_COLORS: ColorMapping = {
  unstaged: "text-emerald-600",
  staged_creation: "text-blue-600",
  staged_edition: "text-violet-600",
  staged_deletion: "text-red-600",
  committed: "text-zinc-600",
};

const DEFAULT_BORDERS: BorderMapping = {
  unstaged: "border border-emerald-500/60 hover:border-emerald-600 border-dashed",
  staged_creation: "border border-blue-500/60 hover:border-blue-600 border-solid",
  staged_edition: "border border-violet-500/60 hover:border-violet-600 border-solid",
  staged_deletion: "border border-red-500/60 hover:border-red-600 border-solid",
  committed: "border border-zinc-500/60 hover:border-zinc-600 border-double border-4",
};

const DEFAULT_BACKGROUNDS: BackgroundVariantMapping = {
  unstaged: "dotted",
  staged_creation: "stripes",
  staged_edition: "stripes",
  staged_deletion: "stripes",
  committed: "stripes",
};

const DEFAULT_FLAGS: FlagVariantMapping = {
  off: undefined,
  dirty: "dotted",
  global_page: "crosses",
  project_scope: "crosses",
};

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
    flag,
    isHovered = false,
    isSelected = false,
    colorMapping,
    borderMapping,
    backgroundVariantMapping: backgroundMapping,
    flagVariantMappings: flagMappings,
    activityContrast = 0.6,
    handlerSize = 8,
    onClick,
    onMouseDown,
    onResizeStart,
    className,
    style,
  } = props;

  const colors = { ...DEFAULT_COLORS, ...(colorMapping || {}) } as ColorMapping;
  const borders = { ...DEFAULT_BORDERS, ...(borderMapping || {}) } as BorderMapping;
  const backgrounds = { ...DEFAULT_BACKGROUNDS, ...(backgroundMapping || {}) } as BackgroundVariantMapping;
  const flags = { ...DEFAULT_FLAGS, ...(flagMappings || {}) } as FlagVariantMapping;

  const bgClass = colors[state];
  const borderClass = borders[state];
  const bgVariant = backgrounds[state];
  const flagVariant = flags[flag]
  const variant = flagVariant || bgVariant;

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
        "absolute pointer-events-auto group overflow-visible",
        bgClass,
        borderClass,
        className,
      )}
      style={{ left, top, width, height, ...style }}
      onClick={onClick}
      onMouseDown={onMouseDown}
    >
      {/* Background preset */}
      <SelectionBackground
        variant={variant}
        contrast={contrast}
      />

      {/* Resize handles when selected */}
      {active && (
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
