// Domain Manager V2 - Change Tracking Behavior Implementation
// Priority: 3 - Track pending changes for persistence

import type { Behavior, CoreDomainState, PendingChanges, ChangesSummary } from './state-types';
import { BehaviorName } from './state-types';
import { ChangeTrackingActionType } from './action-types';

// Simple deep equality check (can be replaced with library if needed)
const deepEqual = (a: any, b: any): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};

// =============================================================================
// CHANGE TRACKING STATE EXTENSION
// =============================================================================

interface ChangeTrackingState<TItem> {
  readonly baseline: {
    readonly persistedItems: ReadonlyArray<TItem>;
    readonly draftItems: ReadonlyArray<TItem>;
    readonly timestamp: number;
    readonly version: number;
  };
  readonly changeVersion: number;
}

// =============================================================================
// CHANGE TRACKING BEHAVIOR
// =============================================================================

export const changeTrackingBehavior: Behavior<CoreDomainState<any> & ChangeTrackingState<any>> = {
  name: BehaviorName.CHANGE_TRACKING,
  priority: 3,
  stateExtensions: {
    changeVersion: 0
  },
  dependencies: [BehaviorName.CRUD],
  
  actionHandlers: {
    [ChangeTrackingActionType.CAPTURE_BASELINE]: (state) => {
      (state as any).baseline = {
        persistedItems: [...state.persistedItems],
        draftItems: [...state.draftItems],
        timestamp: Date.now(),
        version: state.changeVersion + 1
      };
      (state as any).changeVersion = state.changeVersion + 1;
    },
    
    [ChangeTrackingActionType.COMMIT_CHANGES]: (state) => {
      // Move draft items to persisted items and clear drafts
      (state as any).persistedItems = [...state.persistedItems, ...state.draftItems];
      (state as any).draftItems = [];
      
      // Update baseline to current state
      (state as any).baseline = {
        persistedItems: [...state.persistedItems],
        draftItems: [],
        timestamp: Date.now(),
        version: state.changeVersion + 1
      };
      (state as any).changeVersion = state.changeVersion + 1;
    },
    
    [ChangeTrackingActionType.DISCARD_CHANGES]: (state) => {
      // Restore to baseline state
      (state as any).persistedItems = [...state.baseline.persistedItems];
      (state as any).draftItems = [...state.baseline.draftItems];
    },
    
    [ChangeTrackingActionType.RESET_TO_BASELINE]: (state) => {
      // Same as discard changes - restore to baseline
      (state as any).persistedItems = [...state.baseline.persistedItems];
      (state as any).draftItems = [...state.baseline.draftItems];
    }
  },
  
  methodExtensions: {
    getPendingChanges: (state: CoreDomainState<any> & ChangeTrackingState<any>): PendingChanges<any> => {
      const creates = [...state.draftItems];
      
      // Find updates: persisted items that differ from baseline
      const updates = state.persistedItems.filter((current: any) => {
        const baseline = state.baseline.persistedItems.find((i: any) => i.id === current.id);
        return baseline && !deepEqual(current, baseline);
      });
      
      // Find deletes: items in baseline but not in current persisted items
      const deletes = state.baseline.persistedItems.filter((baseline: any) => {
        return !state.persistedItems.find((current: any) => current.id === baseline.id);
      });
      
      return { creates, updates, deletes };
    },
    
    getPendingChangesCount: (state: CoreDomainState<any> & ChangeTrackingState<any>): number => {
      const changes = (state as any).getPendingChanges();
      return changes.creates.length + changes.updates.length + changes.deletes.length;
    },
    
    hasUnsavedChanges: (state: CoreDomainState<any> & ChangeTrackingState<any>): boolean => {
      const changes = (state as any).getPendingChanges();
      return changes.creates.length > 0 || changes.updates.length > 0 || changes.deletes.length > 0;
    },
    
    getChangesSummary: (state: CoreDomainState<any> & ChangeTrackingState<any>): ChangesSummary => {
      const changes = (state as any).getPendingChanges();
      return {
        createCount: changes.creates.length,
        updateCount: changes.updates.length,
        deleteCount: changes.deletes.length,
        totalCount: changes.creates.length + changes.updates.length + changes.deletes.length
      };
    },
    
    getChangeVersion: (state: CoreDomainState<any> & ChangeTrackingState<any>): number => {
      return state.changeVersion;
    },
    
    getBaseline: (state: CoreDomainState<any> & ChangeTrackingState<any>) => {
      return state.baseline;
    }
  }
};
