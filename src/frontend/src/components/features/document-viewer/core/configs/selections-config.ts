/**
 * Selection Domain Configuration
 * 
 * Declarative configuration for selection management using V2 domain manager.
 * Provides all required selection functionality with clean separation of concerns.
 */

import type { DomainManagerConfig, ApiAdapter, DataTransforms as ApiTransforms, ItemComparators as Comparators } from '@/lib/domain-manager';
import { DocumentViewerAPI } from '@/lib/document-viewer-api';
import type { Selection } from '../../types/viewer';
import type { SelectionType, SelectionCreateType } from '@/types';

// =============================================================================
// API ADAPTER - Handles API communication with proper Result<T, unknown> pattern
// =============================================================================

const selectionApiAdapter: ApiAdapter<Selection, Omit<SelectionCreateType, 'document_id'>> = {
  fetch: async (contextId: string) => {
    const result = await DocumentViewerAPI.fetchDocumentSelections(contextId);
    if (result.ok) {
      // Transform API SelectionType to internal Selection format
      const selections: Selection[] = result.value.map(apiSelection => ({
        id: apiSelection.id,
        x: apiSelection.x,
        y: apiSelection.y,
        width: apiSelection.width,
        height: apiSelection.height,
        page_number: apiSelection.page_number,
        confidence: apiSelection.confidence || 1.0,
        document_id: apiSelection.document_id,
        created_at: apiSelection.created_at,
        updated_at: apiSelection.updated_at,
        is_ai_generated: apiSelection.is_ai_generated,
        scope: (apiSelection as any).scope ?? 'document',
        state: (apiSelection as any).state ?? 'staged_creation',
        is_global_page: (apiSelection as any).is_global_page ?? (apiSelection.page_number == null),
      }));
      return { ok: true, value: selections };
    }
    return result as any;
  },
  
  create: async (contextId: string, data: Omit<SelectionCreateType, 'document_id'>) => {
    const result = await DocumentViewerAPI.createSelection(contextId, data);
    if (result.ok) {
      // Transform API SelectionType to internal Selection format
      const selection: Selection = {
        id: result.value.id,
        x: result.value.x,
        y: result.value.y,
        width: result.value.width,
        height: result.value.height,
        page_number: result.value.page_number,
        confidence: result.value.confidence || 1.0,
        document_id: result.value.document_id,
        created_at: result.value.created_at,
        updated_at: result.value.updated_at,
        is_ai_generated: result.value.is_ai_generated,
        scope: (result.value as any).scope ?? 'document',
        state: (result.value as any).state ?? 'staged_creation',
        is_global_page: (result.value as any).is_global_page ?? (result.value.page_number == null),
      };
      return { ok: true, value: selection };
    }
    return result as any;
  },
  
  update: async (id: string, data: Partial<Selection>) => {
    const updateData = {
      state: (data as any).state,
      scope: (data as any).scope,
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      page_number: data.page_number,
      confidence: data.confidence
    } as any;
    
    const result = await DocumentViewerAPI.updateSelection(id, updateData);
    if (result.ok) {
      // Transform API response to Selection format
      const selection: Selection = {
        ...data as Selection,
        id
      };
      return { ok: true, value: selection };
    }
    return result as any;
  },
  
  delete: DocumentViewerAPI.deleteSelection
};

// =============================================================================
// DATA TRANSFORMS - Handle data conversion between internal and API formats
// =============================================================================

const selectionTransforms: ApiTransforms<Selection, Omit<SelectionCreateType, 'document_id'>> = {
  forCreate: (selection: Selection): Omit<SelectionCreateType, 'document_id'> => ({
    // Ensure required fields for creation are present
    scope: selection.scope ?? 'document',
    state: selection.state ?? 'staged_creation',
    x: selection.x,
    y: selection.y,
    width: selection.width,
    height: selection.height,
    page_number: selection.page_number,
    confidence: selection.confidence,
  }),
  
  forUpdate: (selection: Selection): Partial<Selection> => ({
    // Preserve staged_deletion; otherwise, edits move to STAGED_EDITION
    state: (selection as any).state === 'staged_deletion' ? 'staged_deletion' : 'staged_edition',
    scope: selection.scope,
    x: selection.x,
    y: selection.y,
    width: selection.width,
    height: selection.height,
    page_number: selection.page_number,
    confidence: selection.confidence,
  }),
  
  fromApi: (apiItem: unknown): Selection => {
    const apiSelection = apiItem as SelectionType;
    return {
      id: apiSelection.id,
      x: apiSelection.x,
      y: apiSelection.y,
      width: apiSelection.width,
      height: apiSelection.height,
      page_number: apiSelection.page_number,
      confidence: apiSelection.confidence || 1.0,
      document_id: apiSelection.document_id,
      created_at: apiSelection.created_at,
      updated_at: apiSelection.updated_at,
      is_ai_generated: apiSelection.is_ai_generated,
      scope: (apiSelection as any).scope ?? 'document',
      state: (apiSelection as any).state ?? 'staged_creation',
      is_global_page: (apiSelection as any).is_global_page ?? (apiSelection.page_number == null),
    };
  }
};

// =============================================================================
// ITEM COMPARATORS - Handle item identification and equality
// =============================================================================

const selectionComparators: Comparators<Selection> = {
  getId: (selection: Selection): string => selection.id,
  
  areEqual: (a: Selection, b: Selection): boolean => {
    return a.x === b.x &&
           a.y === b.y &&
           a.width === b.width &&
           a.height === b.height &&
           a.page_number === b.page_number &&
           a.confidence === b.confidence;
  }
};

// =============================================================================
// DOMAIN EXTENSIONS - Selection-specific functionality
// =============================================================================

const selectionExtensions = {
  state: {
    // Drawing state for creating new selections
    currentDraw: null as Selection | null,
    isDrawing: false,
    
    // Selection tracking for UI interactions
    selectedItemId: null as string | null,
    
    // Batch operations for smooth drag operations
    isBatchOperation: false,
    suppressUpdateHistory: false,
    batchSnapshot: {
      itemId: null as string | null,
      previous: null as Partial<Selection> | null,
    }
  },
  
  actions: {
    // Drawing workflow actions
    START_DRAW: (state: any, payload: Selection) => {
      state.currentDraw = payload;
      state.isDrawing = true;
      // Clear selection when starting to draw
      state.selectedItemId = null;
    },
    
    UPDATE_DRAW: (state: any, payload: Selection) => {
      if (state.isDrawing) {
        state.currentDraw = payload;
      }
    },
    
    FINISH_DRAW: (state: any) => {
      if (state.isDrawing && state.currentDraw) {
        // Preserve the temporary ID assigned when drawing started; create via CRUD to leverage behaviors
        const created = { ...state.currentDraw };
        if (typeof state.dispatch === 'function') {
          state.dispatch('CREATE_ITEM', created);
        } else {
          // Fallback (should not be needed): mutate drafts
          state.draftItems = [...state.draftItems, created];
        }
        
        // Clear drawing state
        state.currentDraw = null;
        state.isDrawing = false;
      }
    },
    
    CANCEL_DRAW: (state: any) => {
      state.currentDraw = null;
      state.isDrawing = false;
    },
    
    // Selection tracking actions
    SELECT_ITEM: (state: any, payload: string | null) => {
      state.selectedItemId = payload;
    },
    
    // Batch operation actions
    BEGIN_BATCH: (state: any) => {
      state.isBatchOperation = true;
      (state as any).suppressUpdateHistory = true;
      // Capture snapshot of the currently selected item for deterministic history at END_BATCH
      const selectedId = state.selectedItemId;
      if (selectedId) {
        const current = [...state.persistedItems, ...state.draftItems].find((i: Selection) => i.id === selectedId);
        if (current) {
          (state as any).batchSnapshot = {
            itemId: selectedId,
            previous: {
              x: current.x,
              y: current.y,
              width: current.width,
              height: current.height,
              page_number: current.page_number,
              confidence: current.confidence,
            }
          };
        }
      }
    },
    
    // Note: Removed UPDATE_ITEM_BATCH override - use standard UPDATE_ITEM from V2 CRUD behavior
    // This ensures proper change tracking. Batch functionality is handled by BEGIN_BATCH/END_BATCH.
    
    END_BATCH: (state: any) => {
      // End batch and record a single UPDATE in history if applicable
      const snapshot = (state as any).batchSnapshot;
      if (snapshot && snapshot.itemId && snapshot.previous) {
        const current = [...state.persistedItems, ...state.draftItems].find((i: Selection) => i.id === snapshot.itemId);
        if (current && typeof (state as any).recordHistoryChange === 'function') {
          // Compute new values (only changed fields)
          const newValues: Partial<Selection> = {};
          const prev = snapshot.previous as Partial<Selection>;
          const fields: (keyof Selection)[] = ['x','y','width','height','page_number','confidence'];
          for (const key of fields) {
            if ((current as any)[key] !== (prev as any)[key]) {
              (newValues as any)[key] = (current as any)[key];
            }
          }
          if (Object.keys(newValues).length > 0) {
            (state as any).recordHistoryChange({
              type: 'update',
              itemId: snapshot.itemId,
              previousValues: prev,
              newValues,
              timestamp: Date.now(),
            });
          }
        }
      }
      // Reset batching flags and snapshot
      state.isBatchOperation = false;
      (state as any).suppressUpdateHistory = false;
      (state as any).batchSnapshot = { itemId: null, previous: null };
    },
    
    // Page operations
    CLEAR_PAGE: (state: any, payload: number) => {
      // Determine items on the page and dispatch DELETE_ITEMS to leverage behaviors/history
      const toDelete = [...state.persistedItems, ...state.draftItems]
        .filter((item: Selection) => item.page_number === payload)
        .map((item: Selection) => item.id);
      if (toDelete.length > 0 && typeof state.dispatch === 'function') {
        state.dispatch('DELETE_ITEMS', toDelete);
      } else {
        // Fallback (should not be needed)
        state.persistedItems = state.persistedItems.filter((item: Selection) => item.page_number !== payload);
        state.draftItems = state.draftItems.filter((item: Selection) => item.page_number !== payload);
      }
      
      // Clear selection if it was on the cleared page
      if (state.selectedItemId) {
        const stillSelected = [...state.persistedItems, ...state.draftItems].find((item: Selection) => item.id === state.selectedItemId);
        if (!stillSelected) {
          state.selectedItemId = null;
        }
      }
    },
    
    // Note: Removed TOGGLE_ITEM_GLOBAL override - use standard UPDATE_ITEM from selection provider
    // This ensures proper change tracking through V2 CRUD behavior.
    
    // Note: Removed SET_ITEM_PAGE override - use standard UPDATE_ITEM from selection provider
    // This ensures proper change tracking through V2 CRUD behavior.
    
    // Custom DELETE_ITEM that adds selection clearing (runs AFTER core DELETE_ITEM behavior)
    DELETE_ITEM: (state: any, payload: string) => {
      // Clear selection if the selected item was deleted
      if (state.selectedItemId === payload) {
        state.selectedItemId = null;
      }
    }
  },
  
  methods: {
    // Drawing methods
    getCurrentDraw: (state: any): Selection | null => state.currentDraw,
    isCurrentlyDrawing: (state: any): boolean => state.isDrawing,
    
    // Selection methods
    getSelectedItem: (state: any): Selection | null => {
      if (!state.selectedItemId) return null;
      return [...state.persistedItems, ...state.draftItems].find((item: Selection) => item.id === state.selectedItemId) || null;
    },
    
    // Page operations
    getSelectionsForPage: (state: any, page: number | null): Selection[] => {
      return [...state.persistedItems, ...state.draftItems].filter((selection: Selection) => (
        page === null ? (selection.page_number == null) : (selection.page_number === page)
      ));
    },
    
    getGlobalSelections: (state: any): Selection[] => {
      return state.getSelectionsForPage(null);
    },
    
    getPageSelections: (state: any, page: number): Selection[] => {
      return state.getSelectionsForPage(page);
    },
    
    // Batch operations
    isBatch: (state: any): boolean => state.isBatchOperation,
    
    // Selection-specific utilities
    hasSelections: (state: any): boolean => {
      return state.persistedItems.length > 0 || state.draftItems.length > 0;
    },
    
    getSelectionCount: (state: any): number => {
      return state.persistedItems.length + state.draftItems.length;
    },
    
    getSelectionById: (state: any, id: string): Selection | undefined => {
      return [...state.persistedItems, ...state.draftItems].find((s: Selection) => s.id === id);
    }
  }
};

// =============================================================================
// DOMAIN CONFIGURATION - Complete selection domain setup
// =============================================================================

export const selectionDomainConfig: DomainManagerConfig<Selection, Omit<SelectionCreateType, 'document_id'>> = {
  // Domain identification
  domain: 'document-viewer',
  entityName: 'selection',
  
  // API integration
  api: selectionApiAdapter,
  transforms: selectionTransforms,
  comparators: selectionComparators,
  
  // Behavior composition - use available V2 behaviors
  behaviors: [
    'crud',               // Core CRUD operations
    'changeTracking',     // Track pending changes
    'history',            // Undo/redo functionality
    'historyIntegration', // Deterministic recording via behavior; batch suppresses granular updates
    'focusManagement',    // Selection/focus tracking 
    'batchOperations',    // Batch operations for smooth UI
    'bulkOperations'      // Clear all/page operations
  ],
  
  // Domain-specific extensions
  extensions: selectionExtensions
};

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type SelectionDomainManager = ReturnType<typeof import('@/lib/domain-manager').createDomainManager<Selection, Omit<SelectionCreateType, 'document_id'>>>;

export { type Selection } from '../../types/viewer';
export type { SelectionType, SelectionCreateType } from '@/types';
