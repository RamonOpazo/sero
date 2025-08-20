// Production Integration Test
// Verifies that the new domain manager system works correctly for real usage

import { createPromptManager, createSelectionManager } from '../managers';
import type { PromptType } from '../managers/configs/prompt-manager-config';
import type { Selection } from '../managers/configs/selection-manager-config';

const TEST_DOCUMENT_ID = 'prod-test-doc-123';

describe('Production Integration', () => {
  describe('Manager Creation', () => {
    it('should create prompt manager instances successfully', () => {
      const promptManager = createPromptManager(TEST_DOCUMENT_ID);
      
      expect(promptManager).toBeDefined();
      expect(typeof promptManager.getState).toBe('function');
      expect(typeof promptManager.dispatch).toBe('function');
      expect(typeof promptManager.loadItems).toBe('function');
      expect(typeof promptManager.saveAllChanges).toBe('function');
      
      const state = promptManager.getState();
      expect(state.documentId).toBe(TEST_DOCUMENT_ID);
      expect(state.savedItems).toEqual([]);
      expect(state.newItems).toEqual([]);
    });

    it('should create selection manager instances successfully', () => {
      const selectionManager = createSelectionManager(TEST_DOCUMENT_ID);
      
      expect(selectionManager).toBeDefined();
      expect(typeof selectionManager.getState).toBe('function');
      expect(typeof selectionManager.dispatch).toBe('function');
      expect(typeof selectionManager.loadItems).toBe('function');
      expect(typeof selectionManager.saveAllChanges).toBe('function');
      
      const state = selectionManager.getState();
      expect(state.documentId).toBe(TEST_DOCUMENT_ID);
      expect(state.savedItems).toEqual([]);
      expect(state.newItems).toEqual([]);
      
      // Selection-specific features
      expect(state.isDrawing).toBe(false);
      expect(state.currentDraw).toBeNull();
      expect(state.selectedItemId).toBeNull();
    });

    it('should create independent manager instances', () => {
      const promptManager1 = createPromptManager('doc1');
      const promptManager2 = createPromptManager('doc2');
      const selectionManager = createSelectionManager('doc1');
      
      expect(promptManager1.getState().documentId).toBe('doc1');
      expect(promptManager2.getState().documentId).toBe('doc2');
      expect(selectionManager.getState().documentId).toBe('doc1');
      
      // Operations on one shouldn't affect others
      promptManager1.dispatch({ type: 'ADD_ITEM', payload: {
        id: 'test-prompt',
        text: 'Test prompt',
        temperature: 0.7,
        languages: ['en'],
        document_id: 'doc1',
        created_at: new Date().toISOString(),
        updated_at: null
      } as PromptType });
      
      expect(promptManager1.getAllItems()).toHaveLength(1);
      expect(promptManager2.getAllItems()).toHaveLength(0);
      expect(selectionManager.getAllItems()).toHaveLength(0);
    });
  });

  describe('Manager Functionality', () => {
    it('should handle prompt operations correctly', () => {
      const promptManager = createPromptManager(TEST_DOCUMENT_ID);
      
      const testPrompt: PromptType = {
        id: 'test-prompt-1',
        text: 'Test prompt for production',
        temperature: 0.8,
        languages: ['en', 'es'],
        document_id: TEST_DOCUMENT_ID,
        created_at: new Date().toISOString(),
        updated_at: null
      };
      
      // Add prompt
      promptManager.dispatch({ type: 'ADD_ITEM', payload: testPrompt });
      expect(promptManager.getAllItems()).toHaveLength(1);
      expect(promptManager.getItemById('test-prompt-1')).toEqual(testPrompt);
      
      // Update prompt
      const updatedPrompt = { ...testPrompt, text: 'Updated prompt text' };
      promptManager.dispatch({ 
        type: 'UPDATE_ITEM', 
        payload: { id: 'test-prompt-1', updates: updatedPrompt } 
      });
      expect(promptManager.getItemById('test-prompt-1')?.text).toBe('Updated prompt text');
      
      // Delete prompt
      promptManager.dispatch({ type: 'DELETE_ITEM', payload: 'test-prompt-1' });
      expect(promptManager.getAllItems()).toHaveLength(0);
    });

    it('should handle selection operations with all features', () => {
      const selectionManager = createSelectionManager(TEST_DOCUMENT_ID);
      
      const testSelection: Selection = {
        id: 'test-selection-1',
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
      expect(selectionManager.getAllItems()).toHaveLength(1);
      
      // Select it
      selectionManager.dispatch({ type: 'SELECT_ITEM', payload: 'test-selection-1' });
      const state = selectionManager.getState();
      expect(state.selectedItemId).toBe('test-selection-1');
      
      // Test drawing workflow
      const drawingSelection: Selection = {
        id: 'temp-draw',
        x: 0.5,
        y: 0.6,
        width: 0.1,
        height: 0.1,
        page_number: 2,
        confidence: 1.0,
        document_id: TEST_DOCUMENT_ID,
        created_at: new Date().toISOString(),
        updated_at: null,
        is_ai_generated: false
      };
      
      selectionManager.dispatch({ type: 'START_DRAW', payload: drawingSelection });
      let drawState = selectionManager.getState();
      expect(drawState.isDrawing).toBe(true);
      expect(drawState.selectedItemId).toBeNull(); // Should clear selection
      
      selectionManager.dispatch({ type: 'FINISH_DRAW' });
      drawState = selectionManager.getState();
      expect(drawState.isDrawing).toBe(false);
      expect(selectionManager.getAllItems()).toHaveLength(2); // Original + new from draw
    });

    it('should handle bulk operations', () => {
      const promptManager = createPromptManager(TEST_DOCUMENT_ID);
      
      // Add multiple items
      const prompts: PromptType[] = [
        {
          id: 'prompt-1',
          text: 'First prompt',
          temperature: 0.5,
          languages: ['en'],
          document_id: TEST_DOCUMENT_ID,
          created_at: new Date().toISOString(),
          updated_at: null
        },
        {
          id: 'prompt-2', 
          text: 'Second prompt',
          temperature: 0.7,
          languages: ['es'],
          document_id: TEST_DOCUMENT_ID,
          created_at: new Date().toISOString(),
          updated_at: null
        }
      ];
      
      prompts.forEach(prompt => {
        promptManager.dispatch({ type: 'ADD_ITEM', payload: prompt });
      });
      
      expect(promptManager.getAllItems()).toHaveLength(2);
      
      // Clear all
      promptManager.dispatch({ type: 'CLEAR_ALL' });
      expect(promptManager.getAllItems()).toHaveLength(0);
    });
  });

  describe('Type Safety', () => {
    it('should maintain proper TypeScript types', () => {
      const promptManager = createPromptManager(TEST_DOCUMENT_ID);
      const selectionManager = createSelectionManager(TEST_DOCUMENT_ID);
      
      // These should compile without errors and have proper types
      const promptState = promptManager.getState();
      const selectionState = selectionManager.getState();
      
      expect(typeof promptState.savedItems).toBe('object');
      expect(typeof selectionState.isDrawing).toBe('boolean');
      expect(typeof selectionState.selectedItemId).toBe('object'); // null is an object
      
      // Manager methods should exist
      expect(typeof promptManager.getAllItems).toBe('function');
      expect(typeof selectionManager.getAllItems).toBe('function');
      expect(typeof selectionManager.hasUnsavedChanges).toBe('function');
    });
  });
});
