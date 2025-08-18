// SelectionManager Configuration Tests
// Verifies that selectionManagerConfig works correctly with the domain manager library

import { createDomainManager } from '@/lib/domain-manager';
import { selectionManagerConfig, type Selection } from '../selection-manager-config';

const TEST_DOCUMENT_ID = 'test-selection-doc-123';

describe('SelectionManager Configuration', () => {
  let selectionManager: ReturnType<typeof createDomainManager>;

  beforeEach(() => {
    selectionManager = createDomainManager(selectionManagerConfig, TEST_DOCUMENT_ID);
  });

  describe('Initialization', () => {
    it('should initialize with correct domain configuration', () => {
      const state = selectionManager.getState();
      
      expect(state.documentId).toBe(TEST_DOCUMENT_ID);
      expect(state.savedItems).toEqual([]);
      expect(state.newItems).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should have selection-specific state extensions', () => {
      const state = selectionManager.getState();
      
      // Check drawing state
      expect(state.currentDraw).toBeNull();
      expect(state.isDrawing).toBe(false);
      
      // Check selection tracking
      expect(state.selectedItemId).toBeNull();
      
      // Check batch operations
      expect(state.isBatchOperation).toBe(false);
    });
  });

  describe('Drawing Operations', () => {
    it('should handle drawing workflow correctly', () => {
      const drawingSelection: Selection = {
        id: 'temp-selection',
        x: 0.1,
        y: 0.2,
        width: 0.3,
        height: 0.4,
        page_number: 1,
        confidence: 1.0,
        document_id: TEST_DOCUMENT_ID,
        created_at: new Date().toISOString(),
        updated_at: null,
        is_ai_generated: false
      };

      // Start drawing
      selectionManager.dispatch({
        type: 'START_DRAW',
        payload: drawingSelection
      });

      let state = selectionManager.getState();
      expect(state.isDrawing).toBe(true);
      expect(state.currentDraw).toEqual(drawingSelection);
      expect(state.selectedItemId).toBeNull(); // Should clear selection

      // Update drawing
      const updatedDraw = { ...drawingSelection, width: 0.5 };
      selectionManager.dispatch({
        type: 'UPDATE_DRAW',
        payload: updatedDraw
      });

      state = selectionManager.getState();
      expect(state.currentDraw?.width).toBe(0.5);

      // Finish drawing
      selectionManager.dispatch({ type: 'FINISH_DRAW' });

      state = selectionManager.getState();
      expect(state.isDrawing).toBe(false);
      expect(state.currentDraw).toBeNull();
      expect(state.newItems).toHaveLength(1);
    });

    it('should cancel drawing correctly', () => {
      const drawingSelection: Selection = {
        id: 'temp-selection',
        x: 0.1,
        y: 0.2,
        width: 0.3,
        height: 0.4,
        page_number: 1,
        confidence: 1.0,
        document_id: TEST_DOCUMENT_ID,
        created_at: new Date().toISOString(),
        updated_at: null,
        is_ai_generated: false
      };

      selectionManager.dispatch({ type: 'START_DRAW', payload: drawingSelection });
      
      let state = selectionManager.getState();
      expect(state.isDrawing).toBe(true);

      selectionManager.dispatch({ type: 'CANCEL_DRAW' });

      state = selectionManager.getState();
      expect(state.isDrawing).toBe(false);
      expect(state.currentDraw).toBeNull();
      expect(state.newItems).toHaveLength(0); // Should not add to items
    });
  });

  describe('Selection Tracking', () => {
    it('should track selected items correctly', () => {
      const testSelection: Selection = {
        id: 'selection-1',
        x: 0.1,
        y: 0.2,
        width: 0.3,
        height: 0.4,
        page_number: 1,
        confidence: 1.0,
        document_id: TEST_DOCUMENT_ID,
        created_at: new Date().toISOString(),
        updated_at: null,
        is_ai_generated: false
      };

      // Add selection
      selectionManager.dispatch({ type: 'ADD_ITEM', payload: testSelection });

      // Select it
      selectionManager.dispatch({ type: 'SELECT_ITEM', payload: 'selection-1' });

      const state = selectionManager.getState();
      expect(state.selectedItemId).toBe('selection-1');
      
      const selectedItem = (state as any).getSelectedItem?.();
      expect(selectedItem?.id).toBe('selection-1');
    });

    it('should auto-clear selection when item is deleted', () => {
      const testSelection: Selection = {
        id: 'selection-1',
        x: 0.1,
        y: 0.2,
        width: 0.3,
        height: 0.4,
        page_number: 1,
        confidence: 1.0,
        document_id: TEST_DOCUMENT_ID,
        created_at: new Date().toISOString(),
        updated_at: null,
        is_ai_generated: false
      };

      selectionManager.dispatch({ type: 'ADD_ITEM', payload: testSelection });
      selectionManager.dispatch({ type: 'SELECT_ITEM', payload: 'selection-1' });

      let state = selectionManager.getState();
      expect(state.selectedItemId).toBe('selection-1');

      // Delete the selected item
      selectionManager.dispatch({ type: 'DELETE_ITEM', payload: 'selection-1' });

      state = selectionManager.getState();
      expect(state.selectedItemId).toBeNull(); // Should auto-clear
    });
  });

  describe('History Management', () => {
    it('should support undo/redo operations', () => {
      const state = selectionManager.getState();
      
      // Check history methods exist
      expect(typeof (state as any).canUndo).toBe('function');
      expect(typeof (state as any).canRedo).toBe('function');
      expect(typeof (state as any).addToHistory).toBe('function');

      // Initially no history
      expect((state as any).canUndo()).toBe(false);
      expect((state as any).canRedo()).toBe(false);
    });
  });

  describe('Batch Operations', () => {
    it('should handle batch updates correctly', () => {
      const testSelection: Selection = {
        id: 'selection-1',
        x: 0.1,
        y: 0.2,
        width: 0.3,
        height: 0.4,
        page_number: 1,
        confidence: 1.0,
        document_id: TEST_DOCUMENT_ID,
        created_at: new Date().toISOString(),
        updated_at: null,
        is_ai_generated: false
      };

      selectionManager.dispatch({ type: 'ADD_ITEM', payload: testSelection });

      // Start batch operation
      selectionManager.dispatch({ type: 'START_BATCH_OPERATION' });

      let state = selectionManager.getState();
      expect((state as any).isBatch?.()).toBe(true);

      // Batch update
      selectionManager.dispatch({
        type: 'UPDATE_ITEM_BATCH',
        payload: {
          id: 'selection-1',
          updates: { x: 0.5, y: 0.6 }
        }
      });

      const updatedSelection = selectionManager.getItemById('selection-1');
      expect(updatedSelection?.x).toBe(0.5);
      expect(updatedSelection?.y).toBe(0.6);

      // Finish batch operation
      selectionManager.dispatch({ type: 'FINISH_BATCH_OPERATION' });

      state = selectionManager.getState();
      expect((state as any).isBatch?.()).toBe(false);
    });
  });

  describe('Page Operations', () => {
    it('should filter selections by page correctly', () => {
      const selections: Selection[] = [
        {
          id: 'selection-1',
          x: 0.1, y: 0.1, width: 0.2, height: 0.2,
          page_number: 1,
          confidence: 1.0,
          document_id: TEST_DOCUMENT_ID,
          created_at: new Date().toISOString(),
          updated_at: null,
          is_ai_generated: false
        },
        {
          id: 'selection-2',
          x: 0.3, y: 0.3, width: 0.2, height: 0.2,
          page_number: 2,
          confidence: 1.0,
          document_id: TEST_DOCUMENT_ID,
          created_at: new Date().toISOString(),
          updated_at: null,
          is_ai_generated: false
        },
        {
          id: 'selection-3',
          x: 0.5, y: 0.5, width: 0.2, height: 0.2,
          page_number: null, // Global selection
          confidence: 1.0,
          document_id: TEST_DOCUMENT_ID,
          created_at: new Date().toISOString(),
          updated_at: null,
          is_ai_generated: false
        }
      ];

      // Add all selections
      selections.forEach(selection => {
        selectionManager.dispatch({ type: 'ADD_ITEM', payload: selection });
      });

      const state = selectionManager.getState();

      // Test page-specific methods
      const page1Selections = (state as any).getPageSelections?.(1);
      const page2Selections = (state as any).getPageSelections?.(2);
      const globalSelections = (state as any).getGlobalSelections?.();

      expect(page1Selections).toHaveLength(1);
      expect(page2Selections).toHaveLength(1);
      expect(globalSelections).toHaveLength(1);

      expect(page1Selections[0].id).toBe('selection-1');
      expect(page2Selections[0].id).toBe('selection-2');
      expect(globalSelections[0].id).toBe('selection-3');
    });
  });

  describe('Custom Methods', () => {
    it('should provide selection-specific methods', () => {
      const state = selectionManager.getState();
      
      // Test custom methods exist
      expect(typeof (state as any).hasSelections).toBe('function');
      expect(typeof (state as any).getSelectionCount).toBe('function');
      expect(typeof (state as any).getSelectionById).toBe('function');
      expect(typeof (state as any).getCurrentDraw).toBe('function');
      expect(typeof (state as any).isCurrentlyDrawing).toBe('function');
    });

    it('should track selection count correctly', () => {
      const state = selectionManager.getState();
      
      expect((state as any).hasSelections()).toBe(false);
      expect((state as any).getSelectionCount()).toBe(0);

      // Add a selection
      selectionManager.dispatch({
        type: 'ADD_ITEM',
        payload: {
          id: 'selection-1',
          x: 0.1, y: 0.1, width: 0.2, height: 0.2,
          page_number: 1,
          confidence: 1.0,
          document_id: TEST_DOCUMENT_ID,
          created_at: new Date().toISOString(),
          updated_at: null,
          is_ai_generated: false
        }
      });

      const updatedState = selectionManager.getState();
      expect((updatedState as any).hasSelections()).toBe(true);
      expect((updatedState as any).getSelectionCount()).toBe(1);
    });
  });
});
