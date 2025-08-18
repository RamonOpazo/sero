// Domain Manager Library Core Tests
// Tests the generic domain manager implementation with mock configurations

import { createDomainManager, type DomainManagerConfig } from '../index';
import type { Result } from '@/lib/result';

// Mock types for testing
interface MockItem {
  id: string;
  name: string;
  value: number;
}

interface MockCreateItem {
  name: string;
  value: number;
}

const TEST_DOCUMENT_ID = 'test-doc-123';

describe('Domain Manager Core', () => {
  // Mock API that returns successful results
  const mockApi = {
    fetch: jest.fn().mockResolvedValue({ ok: true, value: [] }),
    create: jest.fn().mockResolvedValue({ 
      ok: true, 
      value: { id: 'created-item', name: 'Test', value: 42 }
    }),
    update: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
    delete: jest.fn().mockResolvedValue({ ok: true, value: undefined })
  };

  const mockConfig: DomainManagerConfig<MockItem, MockCreateItem> = {
    domain: 'test',
    entityName: 'item',
    api: mockApi,
    transforms: {
      forCreate: (item: MockItem) => ({ name: item.name, value: item.value }),
      forUpdate: (item: MockItem) => ({ name: item.name, value: item.value })
    },
    comparators: {
      getId: (item: MockItem) => item.id,
      areEqual: (a: MockItem, b: MockItem) => JSON.stringify(a) === JSON.stringify(b)
    },
    behaviors: ['crud', 'changeTracking']
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create manager with correct initial state', () => {
      const manager = createDomainManager(mockConfig, TEST_DOCUMENT_ID);
      const state = manager.getState();

      expect(state.documentId).toBe(TEST_DOCUMENT_ID);
      expect(state.savedItems).toEqual([]);
      expect(state.newItems).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.isSaving).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should have behavior methods available', () => {
      const manager = createDomainManager(mockConfig, TEST_DOCUMENT_ID);
      
      // Should have CRUD behavior methods
      expect(typeof manager.getAllItems).toBe('function');
      expect(typeof manager.getItemById).toBe('function');
      expect(typeof manager.getItemCount).toBe('function');
      expect(typeof manager.hasItems).toBe('function');

      // Should have change tracking behavior methods  
      expect(typeof manager.getPendingChanges).toBe('function');
      expect(typeof manager.hasUnsavedChanges).toBe('function');
    });
  });

  describe('CRUD Operations', () => {
    it('should add items correctly', () => {
      const manager = createDomainManager(mockConfig, TEST_DOCUMENT_ID);
      const testItem: MockItem = { id: 'item-1', name: 'Test Item', value: 100 };

      manager.dispatch({ type: 'ADD_ITEM', payload: testItem });

      const allItems = manager.getAllItems();
      expect(allItems).toHaveLength(1);
      expect(allItems[0]).toEqual(testItem);
    });

    it('should update items correctly', () => {
      const manager = createDomainManager(mockConfig, TEST_DOCUMENT_ID);
      const testItem: MockItem = { id: 'item-1', name: 'Original', value: 100 };

      manager.dispatch({ type: 'ADD_ITEM', payload: testItem });
      manager.dispatch({
        type: 'UPDATE_ITEM',
        payload: { id: 'item-1', updates: { name: 'Updated', value: 200 } }
      });

      const updatedItem = manager.getItemById('item-1');
      expect(updatedItem?.name).toBe('Updated');
      expect(updatedItem?.value).toBe(200);
    });

    it('should delete items correctly', () => {
      const manager = createDomainManager(mockConfig, TEST_DOCUMENT_ID);
      const testItem: MockItem = { id: 'item-1', name: 'Test', value: 100 };

      manager.dispatch({ type: 'ADD_ITEM', payload: testItem });
      expect(manager.getAllItems()).toHaveLength(1);

      manager.dispatch({ type: 'DELETE_ITEM', payload: 'item-1' });
      expect(manager.getAllItems()).toHaveLength(0);
    });
  });

  describe('Change Tracking', () => {
    it('should track pending changes correctly', () => {
      const manager = createDomainManager(mockConfig, TEST_DOCUMENT_ID);
      const testItem: MockItem = { id: 'item-1', name: 'Test', value: 100 };

      expect(manager.hasUnsavedChanges()).toBe(false);

      manager.dispatch({ type: 'ADD_ITEM', payload: testItem });

      expect(manager.hasUnsavedChanges()).toBe(true);
      
      const changes = manager.getPendingChanges();
      expect(changes.creates).toHaveLength(1);
      expect(changes.updates).toHaveLength(0);
      expect(changes.deletes).toHaveLength(0);
    });

    it('should commit changes correctly', () => {
      const manager = createDomainManager(mockConfig, TEST_DOCUMENT_ID);
      const testItem: MockItem = { id: 'item-1', name: 'Test', value: 100 };

      manager.dispatch({ type: 'ADD_ITEM', payload: testItem });
      expect(manager.hasUnsavedChanges()).toBe(true);

      manager.dispatch({ type: 'COMMIT_CHANGES' });
      expect(manager.hasUnsavedChanges()).toBe(false);
    });
  });

  describe('API Integration', () => {
    it('should call API fetch on loadItems', async () => {
      const manager = createDomainManager(mockConfig, TEST_DOCUMENT_ID);

      await manager.loadItems();

      expect(mockApi.fetch).toHaveBeenCalledWith(TEST_DOCUMENT_ID);
    });

    it('should handle API errors gracefully', async () => {
      const failingApi = {
        ...mockApi,
        fetch: jest.fn().mockResolvedValue({ ok: false, error: 'Network error' })
      };

      const failingConfig = { ...mockConfig, api: failingApi };
      const manager = createDomainManager(failingConfig, TEST_DOCUMENT_ID);

      const result = await manager.loadItems();

      expect(result.ok).toBe(false);
      
      const state = manager.getState();
      expect(state.error).toBe('Failed to load items');
    });
  });

  describe('Subscription Pattern', () => {
    it('should notify subscribers of state changes', () => {
      const manager = createDomainManager(mockConfig, TEST_DOCUMENT_ID);
      const mockListener = jest.fn();

      const unsubscribe = manager.subscribe(mockListener);

      manager.dispatch({
        type: 'ADD_ITEM',
        payload: { id: 'item-1', name: 'Test', value: 100 }
      });

      expect(mockListener).toHaveBeenCalled();
      unsubscribe();
    });

    it('should allow unsubscribing', () => {
      const manager = createDomainManager(mockConfig, TEST_DOCUMENT_ID);
      const mockListener = jest.fn();

      const unsubscribe = manager.subscribe(mockListener);
      unsubscribe();

      manager.dispatch({
        type: 'ADD_ITEM',
        payload: { id: 'item-1', name: 'Test', value: 100 }
      });

      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('Behavior Composition', () => {
    it('should support different behavior combinations', () => {
      const minimalConfig = {
        ...mockConfig,
        behaviors: ['crud'] as const
      };

      const fullConfig = {
        ...mockConfig,
        behaviors: ['crud', 'changeTracking', 'history', 'selection'] as const
      };

      const minimalManager = createDomainManager(minimalConfig, TEST_DOCUMENT_ID);
      const fullManager = createDomainManager(fullConfig, TEST_DOCUMENT_ID);

      // Both should have basic CRUD
      expect(typeof minimalManager.getAllItems).toBe('function');
      expect(typeof fullManager.getAllItems).toBe('function');

      // Only full manager should have history
      const minimalState = minimalManager.getState();
      const fullState = fullManager.getState();

      expect((minimalState as any).canUndo).toBeUndefined();
      expect(typeof (fullState as any).canUndo).toBe('function');
    });
  });

  describe('Custom Extensions', () => {
    it('should support custom state extensions', () => {
      const customConfig = {
        ...mockConfig,
        extensions: {
          state: {
            customField: 'test-value',
            customFlag: true
          }
        }
      };

      const manager = createDomainManager(customConfig, TEST_DOCUMENT_ID);
      const state = manager.getState();

      expect(state.customField).toBe('test-value');
      expect(state.customFlag).toBe(true);
    });

    it('should support custom action handlers', () => {
      const customConfig = {
        ...mockConfig,
        extensions: {
          state: { customValue: 0 },
          actions: {
            CUSTOM_ACTION: (state: any, payload: number) => {
              state.customValue = payload;
            }
          }
        }
      };

      const manager = createDomainManager(customConfig, TEST_DOCUMENT_ID);

      manager.dispatch({ type: 'CUSTOM_ACTION', payload: 42 });

      const state = manager.getState();
      expect(state.customValue).toBe(42);
    });
  });
});
