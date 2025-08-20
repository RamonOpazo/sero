/**
 * Selection Domain Configuration
 * 
 * Declarative configuration for selection management using V2 domain manager.
 * Provides all required selection functionality with clean separation of concerns.
 */

import type { DomainManagerConfig, ApiAdapter, DataTransforms as ApiTransforms, ItemComparators as Comparators } from '@/lib/domain-manager';
import { DocumentViewerAPI } from '@/lib/document-viewer-api';
import type { Selection } from '../types/viewer';
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
        is_ai_generated: apiSelection.is_ai_generated
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
        is_ai_generated: result.value.is_ai_generated
      };
      return { ok: true, value: selection };
    }
    return result as any;
  },
  
  update: async (id: string, data: Partial<Selection>) => {
    const updateData = {
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      page_number: data.page_number,
      confidence: data.confidence
    };
    
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
    x: selection.x,
    y: selection.y,
    width: selection.width,
    height: selection.height,
    page_number: selection.page_number,
    confidence: selection.confidence
  }),
  
  forUpdate: (selection: Selection): Partial<Selection> => ({
    x: selection.x,
    y: selection.y,
    width: selection.width,
    height: selection.height,
    page_number: selection.page_number,
    confidence: selection.confidence
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
      is_ai_generated: apiSelection.is_ai_generated
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
    isBatchOperation: false
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
        // Preserve the temporary ID assigned when drawing started; add as a draft item
        const created = { ...state.currentDraw };
        state.draftItems = [...state.draftItems, created];
        
        // Clear drawing state
        state.currentDraw = null;
        state.isDrawing = false;
        
        // Add to history if not in batch mode
        if (!state.isBatchOperation && state.addToHistory) {
          state.addToHistory();
        }
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
    },
    
    // Note: Removed UPDATE_ITEM_BATCH override - use standard UPDATE_ITEM from V2 CRUD behavior
    // This ensures proper change tracking. Batch functionality is handled by BEGIN_BATCH/END_BATCH.
    
    END_BATCH: (state: any) => {
      state.isBatchOperation = false;
      // Add single history entry for the batch
      if (state.addToHistory) {
        state.addToHistory();
      }
    },
    
    // Page operations
    CLEAR_PAGE: (state: any, payload: number) => {
      state.persistedItems = state.persistedItems.filter((item: Selection) => item.page_number !== payload);
      state.draftItems = state.draftItems.filter((item: Selection) => item.page_number !== payload);
      
      // Clear selection if it was on the cleared page
      if (state.selectedItemId) {
        const selectedItem = [...state.persistedItems, ...state.draftItems].find((item: Selection) => item.id === state.selectedItemId);
        if (!selectedItem) {
          state.selectedItemId = null;
        }
      }
      
      // Add to history if not in batch mode
      if (!state.isBatchOperation && state.addToHistory) {
        state.addToHistory();
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
      return [...state.persistedItems, ...state.draftItems].filter((selection: Selection) => selection.page_number === page);
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

export { type Selection } from '../types/viewer';
export type { SelectionType, SelectionCreateType } from '@/types';
