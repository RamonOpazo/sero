/**
 * Consolidated Type Definitions for Document Viewer
 * Phase 2: State Consolidation - Unified types for simplified state management
 */

import { type SelectionCreateType, type SelectionType } from '@/types';

// Local draft type (frontend-only) where state can be omitted until staged
export type SelectionCreateDraft = Omit<SelectionCreateType, 'state'> & { state?: SelectionType['state'] };

// Selection type alias for the new selection manager (supports both saved and new selections)
export type Selection = SelectionType | (SelectionCreateDraft & { id: string });

// Viewer modes
export type ViewerMode = 'pan' | 'select';

// Transform and positioning
export interface Point {
  x: number;
  y: number;
}

export interface ViewerTransform {
  pan: Point;
  zoom: number;
}

export interface DocumentSize {
  width: number;
  height: number;
}

export interface ViewportBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

