// SelectionManager Configuration for Domain Manager Library
import type { SelectionType, SelectionCreateType } from '@/types';
import { type Selection } from './types/viewer';
import { DocumentViewerAPI } from '@/lib/document-viewer-api';
import type { 
  DomainManagerConfig, 
  ApiAdapter,
  ApiTransforms
} from '@/lib/domain-manager';
import { createStandardComparators } from '@/lib/domain-manager';

// =============================================================================
// API ADAPTER
// =============================================================================

const selectionApiAdapter: ApiAdapter<Selection, Omit<SelectionCreateType, 'document_id'>> = {
  fetch: async (documentId: string) => {
    const result = await DocumentViewerAPI.fetchDocumentSelections(documentId);
    if (result.ok) {
      // Transform from API SelectionType to internal Selection format
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
  
  create: async (documentId: string, data: Omit<SelectionCreateType, 'document_id'>) => {
    const result = await DocumentViewerAPI.createSelection(documentId, data);
    if (result.ok) {
      // Transform from API SelectionType to internal Selection format
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
  
  update: DocumentViewerAPI.updateSelection,
  delete: DocumentViewerAPI.deleteSelection
};

// =============================================================================
// TRANSFORMS
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
  
  forUpdate: (selection: Selection): Partial<Pick<SelectionType, 'x' | 'y' | 'width' | 'height' | 'page_number' | 'confidence'>> => ({
    x: selection.x,
    y: selection.y,
    width: selection.width,
    height: selection.height,
    page_number: selection.page_number,
    confidence: selection.confidence
  }),
  
  // fromApi is already handled in the API adapter
};

// =============================================================================
// CUSTOM STATE EXTENSIONS
// =============================================================================

const selectionStateExtensions = {
  // Drawing state
  currentDraw: null as Selection | null,
  isDrawing: false,
  
  // Page operations state
  currentPage: null as number | null,
  
  // Batch operations flag  
  isBatchOperation: false
};

// =============================================================================
// CUSTOM ACTION HANDLERS
// =============================================================================

const selectionActionHandlers = {
  // Override drawing behavior to use our Selection type
  START_DRAW: (state: any, payload: Selection) => {
    state.currentDraw = payload;
    state.isDrawing = true;
    // Clear selection when starting to draw
    if (state.selectedItemId !== undefined) {
      state.selectedItemId = null;
    }
  },
  
  UPDATE_DRAW: (state: any, payload: Selection) => {
    if (state.isDrawing) {
      state.currentDraw = payload;
    }
  },
  
  FINISH_DRAW: (state: any) => {
    if (state.isDrawing && state.currentDraw) {
      // Generate ID and add to items
      const selectionWithId = {
        ...state.currentDraw,
        id: `selection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      state.newItems.push(selectionWithId);
      
      // Add to history if not in batch mode
      if (!state.isBatchOperation && state.addToHistory) {
        state.addToHistory();
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
  
  // Batch operations
  START_BATCH_OPERATION: (state: any) => {
    state.isBatchOperation = true;
  },
  
  UPDATE_ITEM_BATCH: (state: any, payload: { id: string; updates: Partial<Selection> }) => {
    // Same as UPDATE_ITEM but doesn't trigger history in batch mode
    const { id, updates } = payload;
    
    const savedIndex = state.savedItems.findIndex((item: Selection) => item.id === id);
    if (savedIndex !== -1) {
      state.savedItems[savedIndex] = { ...state.savedItems[savedIndex], ...updates };
      return;
    }
    
    const newIndex = state.newItems.findIndex((item: Selection) => item.id === id);
    if (newIndex !== -1) {
      state.newItems[newIndex] = { ...state.newItems[newIndex], ...updates };
    }
  },
  
  FINISH_BATCH_OPERATION: (state: any) => {
    state.isBatchOperation = false;
    // Add single history entry for the entire batch
    if (state.addToHistory) {
      state.addToHistory();
    }
  }
};

// =============================================================================
// CUSTOM METHOD EXTENSIONS
// =============================================================================

const selectionMethodExtensions = {
  // Drawing methods
  getCurrentDraw: (state: any): Selection | null => state.currentDraw,
  isCurrentlyDrawing: (state: any): boolean => state.isDrawing,
  
  // Page-specific methods
  getSelectionsForPage: (state: any, page: number | null): Selection[] => {
    const allSelections = [...state.savedItems, ...state.newItems];
    return allSelections.filter((selection: Selection) => selection.page_number === page);
  },
  
  getGlobalSelections: (state: any): Selection[] => {
    return state.getSelectionsForPage(null);
  },
  
  getPageSelections: (state: any, page: number): Selection[] => {
    return state.getSelectionsForPage(page);
  },
  
  // Batch operations
  isBatch: (state: any): boolean => state.isBatchOperation,
  
  // Selection-specific getters
  getSelectionById: (state: any, id: string): Selection | undefined => {
    return state.savedItems.find((s: Selection) => s.id === id) ||
           state.newItems.find((s: Selection) => s.id === id);
  },
  
  hasSelections: (state: any): boolean => {
    return state.savedItems.length > 0 || state.newItems.length > 0;
  },
  
  getSelectionCount: (state: any): number => {
    return state.savedItems.length + state.newItems.length;
  }
};

// =============================================================================
// CONFIGURATION OBJECT
// =============================================================================

export const selectionManagerConfig: DomainManagerConfig<Selection, Omit<SelectionCreateType, 'document_id'>> = {
  // Domain identification
  domain: 'document-viewer',
  entityName: 'selection',
  
  // API integration
  api: selectionApiAdapter,
  transforms: selectionTransforms,
  comparators: createStandardComparators<Selection>(),
  
  // Behavior composition - matching original SelectionManager functionality
  behaviors: [
    'crud',            // Core CRUD operations
    'changeTracking',  // Pending changes tracking
    'history',         // Undo/redo functionality
    'drawing',         // Drawing state management (overridden)
    'selection',       // Selection tracking
    'batchOperations', // Batch updates
    'pageOperations',  // Page-specific operations
    'bulkOperations'   // Clear all functionality
  ],
  
  // Domain-specific extensions
  extensions: {
    state: selectionStateExtensions,
    actions: selectionActionHandlers,
    methods: selectionMethodExtensions
  }
};

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type SelectionManagerInstance = ReturnType<typeof import('@/lib/domain-manager').createDomainManager<Selection, Omit<SelectionCreateType, 'document_id'>>>;

// Re-export for convenience
export { type Selection } from './types/viewer';
export type { SelectionType, SelectionCreateType } from '@/types';
