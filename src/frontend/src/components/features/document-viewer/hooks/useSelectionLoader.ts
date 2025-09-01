// Removed legacy hook. SelectionProvider performs initial load on mount.
// This file is intentionally left with a throwing stub to catch accidental imports.

export function useSelectionLoader(): never {
  throw new Error('useSelectionLoader has been removed. SelectionProvider now loads selections on mount.');
}
