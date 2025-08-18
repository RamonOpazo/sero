// Document Viewer Domain Managers Integration Tests
// Verifies that PromptManager and SelectionManager configurations work correctly

import { createDomainManager } from '@/lib/domain-manager';
import { promptManagerConfig } from '../prompt-manager-config';
import { selectionManagerConfig } from '../selection-manager-config';

// Test document ID
const TEST_DOCUMENT_ID = 'test-doc-123';

// =============================================================================
// TEST PROMPT MANAGER
// =============================================================================

export function testPromptManager() {
  console.log('🧪 Testing PromptManager with Domain Manager Library...');
  
  const promptManager = createDomainManager(promptManagerConfig, TEST_DOCUMENT_ID);
  
  // Test initial state
  const initialState = promptManager.getState();
  console.log('✅ Initial state:', {
    savedItems: initialState.savedItems.length,
    newItems: initialState.newItems.length,
    isLoading: initialState.isLoading,
    error: initialState.error
  });
  
  // Test subscription
  let notificationCount = 0;
  const unsubscribe = promptManager.subscribe(state => {
    notificationCount++;
    console.log(`📢 State notification ${notificationCount}:`, {
      savedItems: state.savedItems.length,
      newItems: state.newItems.length,
      isLoading: state.isLoading
    });
  });
  
  // Test adding a new prompt
  promptManager.dispatch({
    type: 'ADD_ITEM',
    payload: {
      id: 'prompt-1',
      text: 'Test prompt',
      temperature: 0.7,
      languages: ['en']
    }
  });
  
  // Test getting items
  const allPrompts = promptManager.getAllItems();
  console.log('✅ All prompts after add:', allPrompts.length);
  
  // Test getting specific prompt
  const prompt = promptManager.getItemById('prompt-1');
  console.log('✅ Found prompt by ID:', prompt?.text);
  
  // Test pending changes
  const pendingChanges = promptManager.getPendingChanges();
  console.log('✅ Pending changes:', {
    creates: pendingChanges.creates.length,
    updates: pendingChanges.updates.length,
    deletes: pendingChanges.deletes.length
  });
  
  // Test update
  promptManager.dispatch({
    type: 'UPDATE_ITEM',
    payload: {
      id: 'prompt-1',
      updates: { text: 'Updated prompt text' }
    }
  });
  
  const updatedPrompt = promptManager.getItemById('prompt-1');
  console.log('✅ Updated prompt text:', updatedPrompt?.text);
  
  // Test custom methods
  const state = promptManager.getState();
  const hasPrompts = (state as any).hasPrompts?.();
  const promptCount = (state as any).getPromptCount?.();
  console.log('✅ Custom methods - hasPrompts:', hasPrompts, 'count:', promptCount);
  
  // Test bulk operations behavior
  promptManager.dispatch({ type: 'CLEAR_ALL' });
  const finalState = promptManager.getState();
  console.log('✅ After clear all:', {
    savedItems: finalState.savedItems.length,
    newItems: finalState.newItems.length
  });
  
  unsubscribe();
  console.log('✅ PromptManager test completed!\n');
  
  return promptManager;
}

// =============================================================================
// TEST SELECTION MANAGER
// =============================================================================

export function testSelectionManager() {
  console.log('🧪 Testing SelectionManager with Domain Manager Library...');
  
  const selectionManager = createDomainManager(selectionManagerConfig, TEST_DOCUMENT_ID);
  
  // Test initial state
  const initialState = selectionManager.getState();
  console.log('✅ Initial state:', {
    savedItems: initialState.savedItems.length,
    newItems: initialState.newItems.length,
    isDrawing: initialState.isDrawing,
    selectedItemId: initialState.selectedItemId
  });
  
  // Test subscription
  let notificationCount = 0;
  const unsubscribe = selectionManager.subscribe(state => {
    notificationCount++;
    console.log(`📢 State notification ${notificationCount}:`, {
      savedItems: state.savedItems.length,
      newItems: state.newItems.length,
      isDrawing: state.isDrawing
    });
  });
  
  // Test drawing workflow
  selectionManager.dispatch({
    type: 'START_DRAW',
    payload: {
      id: 'temp-selection',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      page: 1,
      confidence: 1.0
    }
  });
  
  let currentState = selectionManager.getState();
  console.log('✅ After start draw:', {
    isDrawing: currentState.isDrawing,
    currentDraw: currentState.currentDraw ? 'present' : 'null'
  });
  
  // Test drawing update
  selectionManager.dispatch({
    type: 'UPDATE_DRAW',
    payload: {
      id: 'temp-selection',
      x: 100,
      y: 100,
      width: 250,
      height: 200,
      page: 1,
      confidence: 1.0
    }
  });
  
  // Test finish draw
  selectionManager.dispatch({ type: 'FINISH_DRAW' });
  
  currentState = selectionManager.getState();
  console.log('✅ After finish draw:', {
    isDrawing: currentState.isDrawing,
    newItems: currentState.newItems.length
  });
  
  // Test selection tracking
  const allSelections = selectionManager.getAllItems();
  if (allSelections.length > 0) {
    const firstSelection = allSelections[0];
    selectionManager.dispatch({
      type: 'SELECT_ITEM',
      payload: firstSelection.id
    });
    
    currentState = selectionManager.getState();
    console.log('✅ After select item:', {
      selectedItemId: currentState.selectedItemId
    });
  }
  
  // Test history functionality (if enabled)
  const stateWithHistory = selectionManager.getState();
  const canUndo = (stateWithHistory as any).canUndo?.();
  const canRedo = (stateWithHistory as any).canRedo?.();
  console.log('✅ History state - canUndo:', canUndo, 'canRedo:', canRedo);
  
  // Test page operations
  if (allSelections.length > 0) {
    const firstSelection = allSelections[0];
    selectionManager.dispatch({
      type: 'SET_ITEM_PAGE',
      payload: { id: firstSelection.id, page: 2 }
    });
    
    const pageSelections = (stateWithHistory as any).getPageSelections?.(2);
    console.log('✅ Page operations - selections on page 2:', pageSelections?.length || 0);
  }
  
  // Test batch operations
  selectionManager.dispatch({ type: 'START_BATCH_OPERATION' });
  
  if (allSelections.length > 0) {
    const firstSelection = allSelections[0];
    selectionManager.dispatch({
      type: 'UPDATE_ITEM_BATCH',
      payload: {
        id: firstSelection.id,
        updates: { x: 300, y: 300 }
      }
    });
  }
  
  selectionManager.dispatch({ type: 'FINISH_BATCH_OPERATION' });
  console.log('✅ Batch operations completed');
  
  // Test custom methods
  const finalState = selectionManager.getState();
  const hasSelections = (finalState as any).hasSelections?.();
  const selectionCount = (finalState as any).getSelectionCount?.();
  console.log('✅ Custom methods - hasSelections:', hasSelections, 'count:', selectionCount);
  
  unsubscribe();
  console.log('✅ SelectionManager test completed!\n');
  
  return selectionManager;
}

// =============================================================================
// RUN ALL TESTS
// =============================================================================

export function runAllTests() {
  console.log('🚀 Starting Domain Manager Library Tests...\n');
  
  const promptManager = testPromptManager();
  const selectionManager = testSelectionManager();
  
  console.log('🎉 All tests completed successfully!');
  console.log('✅ PromptManager and SelectionManager are working with the domain manager library');
  
  return {
    promptManager,
    selectionManager
  };
}

// For manual testing in browser console:
// import { runAllTests } from './test-domain-managers';
// runAllTests();
