# Domain Manager Architecture - Behavior Specifications

## Behavior Specifications

### 1. CRUD Behavior
**Priority**: 2  
**Responsibility**: Basic data operations and state management  
**Dependencies**: None  

**State Extensions**: 
```typescript
// Uses core state only
```

**Action Handlers**:
```typescript
{
  [CrudActionType.SET_LOADING]: (state, isLoading: boolean) => void;
  [CrudActionType.SET_SAVING]: (state, isSaving: boolean) => void;
  [CrudActionType.SET_CREATING]: (state, isCreating: boolean) => void;
  [CrudActionType.SET_ERROR]: (state, error: string | null) => void;
  [CrudActionType.LOAD_ITEMS]: (state, items: ReadonlyArray<TItem>) => void;
  [CrudActionType.CREATE_ITEM]: (state, item: TItem) => void;
  [CrudActionType.UPDATE_ITEM]: (state, { id, updates }: { id: string, updates: Partial<TItem> }) => void;
  [CrudActionType.DELETE_ITEM]: (state, id: string) => void;
  [CrudActionType.CLEAR_GLOBAL_CONTEXT]: (state) => void;
  [CrudActionType.CLEAR_LOCAL_CONTEXT]: (state, { contextFilter }: { contextFilter?: string }) => void;
}
```

**Method Extensions**:
```typescript
{
  getAllItems: (state) => ReadonlyArray<TItem>;
  getItemById: (state, id: string) => TItem | undefined;
  getItemCount: (state) => number;
  hasItems: (state) => boolean;
  getPersistedItems: (state) => ReadonlyArray<TItem>;
  getDraftItems: (state) => ReadonlyArray<TItem>;
}
```

### 2. Change Tracking Behavior  
**Priority**: 3  
**Responsibility**: Track pending changes for persistence  
**Dependencies**: [CRUD]  

**State Extensions**: 
```typescript
{
  readonly baseline: StateSnapshot<TItem>;
  readonly changeVersion: number;
}
```

**Action Handlers**:
```typescript
{
  [ChangeTrackingActionType.CAPTURE_BASELINE]: (state) => void;
  [ChangeTrackingActionType.COMMIT_CHANGES]: (state) => void;
  [ChangeTrackingActionType.DISCARD_CHANGES]: (state) => void;
  [ChangeTrackingActionType.RESET_TO_BASELINE]: (state) => void;
}
```

**Method Extensions**:
```typescript
{
  getPendingChanges: (state) => PendingChanges<TItem>;
  getPendingChangesCount: (state) => number;
  hasUnsavedChanges: (state) => boolean;
  getChangesSummary: (state) => ChangesSummary;
}

interface PendingChanges<TItem> {
  readonly creates: ReadonlyArray<TItem>;
  readonly updates: ReadonlyArray<TItem>;
  readonly deletes: ReadonlyArray<TItem>;
}

interface ChangesSummary {
  readonly createCount: number;
  readonly updateCount: number;
  readonly deleteCount: number;
  readonly totalCount: number;
}
```

### 3. History Behavior
**Priority**: 9  
**Responsibility**: Undo/Redo functionality  
**Dependencies**: [CRUD, CHANGE_TRACKING]  

**State Extensions**: 
```typescript
{
  readonly changeHistory: ReadonlyArray<HistoryRecord>;
  readonly currentHistoryIndex: number;
  readonly isUndoRedoOperation: boolean;
  readonly maxHistorySize: number;
}

interface HistoryRecord {
  readonly type: ChangeType;
  readonly timestamp: number;
  readonly item?: TItem;
  readonly itemId?: string;
  readonly previousValues?: Partial<TItem>;
  readonly newValues?: Partial<TItem>;
  readonly items?: ReadonlyArray<TItem>;
  readonly contextFilter?: string;
}

enum ChangeType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  BULK_DELETE = 'bulk_delete',
  CONTEXT_CLEAR = 'context_clear'
}
```

**Action Handlers**:
```typescript
{
  [HistoryActionType.UNDO]: (state) => void;
  [HistoryActionType.REDO]: (state) => void;
  [HistoryActionType.RECORD_CHANGE]: (state, change: HistoryRecord) => void;
  [HistoryActionType.CLEAR_HISTORY]: (state) => void;
  [HistoryActionType.TRUNCATE_HISTORY]: (state, maxSize: number) => void;
}
```

**Method Extensions**:
```typescript
{
  canUndo: (state) => boolean;
  canRedo: (state) => boolean;
  getHistorySize: (state) => number;
  getHistoryPosition: (state) => number;
  recordHistoryChange: (state, change: HistoryRecord) => void;
}
```

### 4. History Integration Behavior
**Priority**: 1  
**Responsibility**: Record changes for history tracking  
**Dependencies**: [HISTORY]  

**State Extensions**: None

**Action Handlers**:
```typescript
// Intercepts actions to record history before state changes
{
  [CrudActionType.CREATE_ITEM]: (state, item: TItem, context: ActionContext) => void;
  [CrudActionType.UPDATE_ITEM]: (state, { id, updates }, context: ActionContext) => void;
  [CrudActionType.DELETE_ITEM]: (state, id: string, context: ActionContext) => void;
  [CrudActionType.CLEAR_GLOBAL_CONTEXT]: (state, _, context: ActionContext) => void;
  [CrudActionType.CLEAR_LOCAL_CONTEXT]: (state, { contextFilter }, context: ActionContext) => void;
}
```

**Method Extensions**: None

### 5. Focus Management Behavior
**Priority**: 5  
**Responsibility**: Track focused items for UI interaction  
**Dependencies**: [CRUD]  

**State Extensions**:
```typescript
{
  readonly focusedItemId: string | null;
  readonly focusedItemIds: ReadonlySet<string>;
  readonly lastFocusedTimestamp: number;
}
```

**Action Handlers**:
```typescript
{
  [FocusActionType.SET_FOCUSED_ITEM]: (state, itemId: string | null) => void;
  [FocusActionType.CLEAR_FOCUSED_ITEM]: (state) => void;
  [FocusActionType.SET_FOCUSED_ITEMS]: (state, itemIds: ReadonlyArray<string>) => void;
  [FocusActionType.TOGGLE_ITEM_FOCUS]: (state, itemId: string) => void;
  // Auto-clear focus when item is deleted
  [CrudActionType.DELETE_ITEM]: (state, id: string) => void;
}
```

**Method Extensions**:
```typescript
{
  getFocusedItem: (state) => TItem | null;
  getFocusedItems: (state) => ReadonlyArray<TItem>;
  isFocused: (state, itemId: string) => boolean;
  getFocusCount: (state) => number;
  hasFocus: (state) => boolean;
}
```

### 6. Draft Management Behavior
**Priority**: 4  
**Responsibility**: Interactive draft state for creation/editing  
**Dependencies**: [CRUD]  

**State Extensions**:
```typescript
{
  readonly currentDraft: Partial<TItem> | null;
  readonly isDrafting: boolean;
  readonly draftMetadata: DraftMetadata | null;
}

interface DraftMetadata {
  readonly startTime: number;
  readonly draftType: DraftType;
  readonly sourceItemId?: string;
  readonly contextId: string;
}

enum DraftType {
  CREATE = 'create',
  EDIT = 'edit',
  DUPLICATE = 'duplicate'
}
```

**Action Handlers**:
```typescript
{
  [DraftActionType.START_DRAFT]: (state, draft: Partial<TItem>, metadata?: Partial<DraftMetadata>) => void;
  [DraftActionType.UPDATE_DRAFT]: (state, updates: Partial<TItem>) => void;
  [DraftActionType.COMMIT_DRAFT]: (state) => void;
  [DraftActionType.DISCARD_DRAFT]: (state) => void;
}
```

**Method Extensions**:
```typescript
{
  getCurrentDraft: (state) => Partial<TItem> | null;
  isDrafting: (state) => boolean;
  getDraftMetadata: (state) => DraftMetadata | null;
  validateDraft: (state) => ValidationResult;
}

interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
}
```

### 7. Batch Operations Behavior
**Priority**: 6  
**Responsibility**: Handle batched operations efficiently  
**Dependencies**: [CRUD, HISTORY]  

**State Extensions**:
```typescript
{
  readonly isBatching: boolean;
  readonly batchOperations: ReadonlyArray<BatchOperation>;
  readonly batchMetadata: BatchMetadata | null;
}

interface BatchOperation {
  readonly type: CrudActionType;
  readonly payload: unknown;
  readonly timestamp: number;
}

interface BatchMetadata {
  readonly startTime: number;
  readonly expectedOperations: number;
  readonly contextId: string;
}
```

**Action Handlers**:
```typescript
{
  [BatchActionType.BEGIN_BATCH]: (state, metadata?: Partial<BatchMetadata>) => void;
  [BatchActionType.END_BATCH]: (state) => void;
  [BatchActionType.EXECUTE_BATCH]: (state) => void;
  [BatchActionType.ROLLBACK_BATCH]: (state) => void;
  // Batch versions of CRUD operations
  [CrudActionType.CREATE_ITEMS]: (state, items: ReadonlyArray<TItem>) => void;
  [CrudActionType.UPDATE_ITEMS]: (state, updates: ReadonlyArray<{ id: string, updates: Partial<TItem> }>) => void;
  [CrudActionType.DELETE_ITEMS]: (state, ids: ReadonlyArray<string>) => void;
}
```

**Method Extensions**:
```typescript
{
  isBatching: (state) => boolean;
  getBatchSize: (state) => number;
  getBatchOperations: (state) => ReadonlyArray<BatchOperation>;
  getBatchProgress: (state) => number;
}
```

### 8. Context Operations Behavior
**Priority**: 7  
**Responsibility**: Manage contextual filtering and operations  
**Dependencies**: [CRUD]  

**State Extensions**:
```typescript
{
  readonly currentContext: string | null;
  readonly contextFilters: ReadonlyMap<string, ContextFilter>;
  readonly contextMetadata: ReadonlyMap<string, unknown>;
}

interface ContextFilter {
  readonly predicate: (item: TItem) => boolean;
  readonly label: string;
  readonly isActive: boolean;
}
```

**Action Handlers**:
```typescript
{
  [ContextActionType.SET_CONTEXT]: (state, contextId: string) => void;
  [ContextActionType.CLEAR_CONTEXT]: (state) => void;
  [ContextActionType.SWITCH_CONTEXT]: (state, contextId: string) => void;
  [ContextActionType.FILTER_BY_CONTEXT]: (state, filter: ContextFilter) => void;
}
```

**Method Extensions**:
```typescript
{
  getItemsForContext: (state, contextId: string | null) => ReadonlyArray<TItem>;
  getCurrentContext: (state) => string | null;
  getContextItems: (state) => ReadonlyArray<TItem>;
  getGlobalItems: (state) => ReadonlyArray<TItem>;
  hasContext: (state) => boolean;
}
```

### 9. Bulk Operations Behavior
**Priority**: 8  
**Responsibility**: Handle bulk context operations  
**Dependencies**: [CRUD, CONTEXT_OPERATIONS, HISTORY_INTEGRATION]  

**State Extensions**:
```typescript
{
  readonly isClearing: boolean;
  readonly clearOperations: ReadonlyArray<ClearOperation>;
}

interface ClearOperation {
  readonly type: 'global' | 'local';
  readonly contextFilter?: string;
  readonly timestamp: number;
  readonly itemCount: number;
}
```

**Action Handlers**:
```typescript
{
  [CrudActionType.CLEAR_GLOBAL_CONTEXT]: (state) => void;
  [CrudActionType.CLEAR_LOCAL_CONTEXT]: (state, { contextFilter }: { contextFilter?: string }) => void;
}
```

**Method Extensions**:
```typescript
{
  clearGlobalContext: (state) => void;
  clearLocalContext: (state, contextFilter?: string) => void;
  isClearing: (state) => boolean;
  getLastClearOperation: (state) => ClearOperation | null;
}
```

## Action Flow Architecture

### Execution Pipeline
```
Action Dispatch → Action Validation → Handler Priority Sort → Behavior Execution → State Mutation → Notification
```

### Handler Priority System
Behaviors execute in strict priority order:

1. **History Integration** (Priority 1) - Captures before-state
2. **CRUD** (Priority 2) - Performs state mutations
3. **Change Tracking** (Priority 3) - Updates tracking state
4. **Draft Management** (Priority 4) - Updates draft state
5. **Focus Management** (Priority 5) - Updates focus state
6. **Batch Operations** (Priority 6) - Manages batch state
7. **Context Operations** (Priority 7) - Manages context state
8. **Bulk Operations** (Priority 8) - Manages bulk operations
9. **History** (Priority 9) - Processes undo/redo operations

### Action Handler Composition
```typescript
interface HandlerExecution {
  readonly behavior: BehaviorName;
  readonly priority: number;
  readonly handler: ActionHandler<any, any>;
}

const executeHandlers = <TState>(
  state: TState,
  action: DomainAction,
  handlers: ReadonlyArray<HandlerExecution>
): void => {
  // Sort by priority (lower numbers execute first)
  const sortedHandlers = [...handlers].sort((a, b) => a.priority - b.priority);
  
  // Execute in order
  sortedHandlers.forEach(({ handler }) => {
    handler(state, action.payload, {
      timestamp: Date.now(),
      source: ActionSource.USER,
      metadata: action.metadata
    });
  });
};
```

## Usage Example

```typescript
// Configuration (fully declarative)
const itemManagerConfig: DomainManagerConfig<Item> = {
  domain: 'document-viewer',
  entityName: 'item',
  api: itemApiAdapter,
  transforms: itemTransforms,
  comparators: createStandardComparators<Item>(),
  behaviors: [
    BehaviorName.CRUD,
    BehaviorName.CHANGE_TRACKING,
    BehaviorName.HISTORY,
    BehaviorName.HISTORY_INTEGRATION,
    BehaviorName.FOCUS_MANAGEMENT,
    BehaviorName.DRAFT_MANAGEMENT,
    BehaviorName.BULK_OPERATIONS
  ],
  options: {
    historyLimit: 50,
    autoSave: false,
    strictMode: true
  }
};

// Usage (type-safe)
const manager = createDomainManager(itemManagerConfig, documentId);

// All operations are type-safe
manager.dispatch(CrudActionType.CREATE_ITEM, newItem);
manager.dispatch(CrudActionType.UPDATE_ITEM, { id: '123', updates: { name: 'New Name' } });
manager.dispatch(CrudActionType.DELETE_ITEM, '123');
manager.dispatch(CrudActionType.CLEAR_GLOBAL_CONTEXT);
manager.dispatch(CrudActionType.CLEAR_LOCAL_CONTEXT, { contextFilter: 'page-1' });
manager.dispatch(HistoryActionType.UNDO);
manager.dispatch(HistoryActionType.REDO);
manager.dispatch(FocusActionType.SET_FOCUSED_ITEM, 'item-456');
manager.dispatch(DraftActionType.START_DRAFT, { name: 'New Item' });
```

## Benefits of This Generic Architecture

1. **Domain Agnostic**: Works with any entity type (selections, prompts, users, etc.)
2. **CRUD Consistent**: Uses standard database terminology
3. **Context Independent**: No assumptions about pages, documents, or specific UI patterns  
4. **Type Safe**: Full TypeScript safety with enum-driven actions
5. **Composable**: Mix and match behaviors as needed
6. **Testable**: Each behavior is independently testable
7. **Extensible**: Add new behaviors without touching existing code
8. **Predictable**: Functional approach with immutable state
9. **Debuggable**: Clear action flow and state transitions
10. **Performant**: Efficient change detection and minimal re-renders

This generic approach ensures the domain manager can be used for any CRUD-based entity management across the entire application.
