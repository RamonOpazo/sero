# Pattern Analysis: Extracted from Working Managers

## 🔍 **Common Patterns Identified**

### **1. State Management Pattern**
```typescript
// Both managers share this exact structure:
interface CommonState<T> {
  // Core data split
  saved{Domain}s: T[];     // PromptManager: savedPrompts, SelectionManager: savedSelections
  new{Domain}s: T[];       // PromptManager: newPrompts, SelectionManager: newSelections
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  
  // Error handling
  error: string | null;
  
  // Context
  documentId: string;
  
  // Change tracking
  initialState: Snapshot<T>;
}
```

### **2. Action Dispatch Pattern**
```typescript
// Both use identical switch/case dispatch pattern
dispatch(action: Action) {
  switch (action.type) {
    case 'SET_LOADING': this.state.isLoading = action.payload; break;
    case 'SET_SAVING': this.state.isSaving = action.payload; break;
    case 'SET_ERROR': this.state.error = action.payload; break;
    // ... domain-specific actions
  }
  this.notify();
}
```

### **3. Subscription Pattern**
```typescript
// Identical in both managers
private listeners: Set<(state: State) => void> = new Set();
subscribe(listener: (state: State) => void): () => void {
  this.listeners.add(listener);
  return () => this.listeners.delete(listener);
}
private notify() {
  this.listeners.forEach(listener => listener(this.getState()));
}
```

### **4. API Integration Pattern**
```typescript
// Both follow identical async/Result pattern
async loadItems(): Promise<Result<T[], unknown>> {
  this.dispatch({ type: 'SET_LOADING', payload: true });
  this.dispatch({ type: 'SET_ERROR', payload: null });
  
  const result = await API.fetchItems(this.state.documentId);
  
  if (result.ok) {
    this.dispatch({ type: 'LOAD_SAVED_ITEMS', payload: result.value });
  } else {
    this.dispatch({ type: 'SET_ERROR', payload: 'Failed to load items' });
    this.dispatch({ type: 'SET_LOADING', payload: false });
  }
  
  return result;
}
```

### **5. Pending Changes Pattern**
```typescript
// Both implement identical change tracking logic
getPendingChanges(): PendingChanges<T> {
  const creates = [...this.state.newItems];
  
  // Find updates: saved items that differ from initial state
  const updates = this.state.savedItems.filter(current => {
    const initial = this.state.initialState.savedItems.find(i => i.id === current.id);
    return initial && !deepEqual(current, initial);
  });
  
  // Find deletes: items in initial state but not in current
  const deletes = this.state.initialState.savedItems.filter(initial => {
    return !this.state.savedItems.find(current => current.id === initial.id);
  });
  
  return { creates, updates, deletes };
}
```

## 🧩 **Reusable Behaviors Identified**

### **1. CRUD Behavior**
**Found in**: Both managers
**Actions**: `SET_LOADING`, `SET_SAVING`, `SET_ERROR`, `ADD_ITEM`, `UPDATE_ITEM`, `DELETE_ITEM`, `LOAD_SAVED_ITEMS`
**State**: `isLoading`, `isSaving`, `error`, `savedItems`, `newItems`
**Methods**: `getAllItems()`, `getItemById()`, `getItemCount()`, `hasItems()`

### **2. Change Tracking Behavior**
**Found in**: Both managers
**Actions**: `COMMIT_CHANGES`, `DISCARD_ALL_CHANGES`
**State**: `initialState`
**Methods**: `getPendingChanges()`, `getPendingChangesCount()`, `hasUnsavedChanges()`

### **3. History Behavior**
**Found in**: SelectionManager only, but reusable
**Actions**: `UNDO`, `REDO`
**State**: `changeHistory`, `currentHistoryIndex`
**Methods**: `canUndo()`, `canRedo()`, `addToHistory()`
**Features**: 
- 50-item history limit
- Batch operation support
- Snapshot validation

### **4. Drawing Behavior**
**Found in**: SelectionManager only
**Actions**: `START_DRAW`, `UPDATE_DRAW`, `FINISH_DRAW`, `CANCEL_DRAW`
**State**: `currentDraw`, `isDrawing`
**Features**:
- Auto-generates IDs on finish
- Clears selection when drawing starts
- Guards against invalid states

### **5. Selection Tracking Behavior**
**Found in**: SelectionManager only, but pattern is reusable
**Actions**: `SELECT_ITEM`, `CLEAR_SELECTION`
**State**: `selectedItemId`
**Methods**: `getSelectedItem()`
**Features**:
- Auto-clears selection on delete
- Null-safe selection access

### **6. Batch Operations Behavior**
**Found in**: SelectionManager, but pattern is reusable
**Actions**: `UPDATE_ITEM_BATCH`, `FINISH_BATCH_OPERATION`
**State**: `isBatchOperation` (private flag)
**Features**:
- Prevents history spam during batch updates
- Single history entry for entire batch

### **7. Page Operations Behavior**
**Found in**: SelectionManager only
**Actions**: `SET_ITEM_PAGE`, `TOGGLE_ITEM_GLOBAL`, `CLEAR_PAGE`
**Features**:
- Toggle between global (null) and specific page
- Bulk page clearing
- Auto-clears selection if on cleared page

### **8. Bulk Operations Behavior**
**Found in**: Both managers (PromptManager has domain-specific `isClearing`)
**Actions**: `CLEAR_ALL`, `SET_CLEARING`
**State**: `isClearing` (domain-specific loading state)

## 🔧 **API Adapter Pattern**

Both managers follow identical API integration:

```typescript
interface ApiAdapter<T, CreateT> {
  fetch: (documentId: string) => Promise<Result<T[], unknown>>;
  create: (documentId: string, data: CreateT) => Promise<Result<T, unknown>>;
  update: (id: string, data: Partial<T>) => Promise<Result<void, unknown>>;
  delete: (id: string) => Promise<Result<void, unknown>>;
}

// Transforms for API compatibility
interface ApiTransforms<T, CreateT> {
  forCreate: (item: T) => CreateT;
  forUpdate: (item: T) => Partial<T>;
  fromApi?: (apiItem: any) => T;  // For SelectionManager conversion
}
```

## 📊 **Behavior Composition Matrix**

| Behavior | PromptManager | SelectionManager | Reusability |
|----------|---------------|------------------|-------------|
| CRUD | ✅ | ✅ | **High** - Core pattern |
| Change Tracking | ✅ | ✅ | **High** - Core pattern |
| History | ❌ | ✅ | **High** - Reusable logic |
| Drawing | ❌ | ✅ | **Medium** - Domain-specific |
| Selection Tracking | ❌ | ✅ | **High** - Reusable pattern |
| Batch Operations | ❌ | ✅ | **High** - Reusable pattern |
| Page Operations | ❌ | ✅ | **Medium** - Domain-specific |
| Bulk Operations | ✅ (isClearing) | ✅ (CLEAR_ALL) | **High** - Common need |

## 🎯 **Configuration Requirements**

Based on analysis, our configuration system needs:

1. **Domain Configuration**: `name`, `entityType`, `createType`
2. **API Adapter**: Pluggable API conforming to `Result<T>` pattern
3. **Behavior Composition**: Array of composable behaviors
4. **Transform Functions**: `forCreate`, `forUpdate`, `fromApi`
5. **Comparator Functions**: `getId`, `areEqual`
6. **State Extensions**: Domain-specific state fields
7. **Action Extensions**: Domain-specific actions
8. **Method Extensions**: Domain-specific computed methods

## ✅ **Validation: Configuration Coverage**

All identified patterns can be expressed through configuration:

- ✅ **State Management**: Covered by core configuration + behavior extensions
- ✅ **Action Dispatch**: Covered by enum-based functional pattern matching
- ✅ **Subscription Pattern**: Covered by core factory implementation
- ✅ **API Integration**: Covered by pluggable API adapter pattern
- ✅ **Pending Changes**: Covered by change tracking behavior
- ✅ **All Behaviors**: Each can be expressed as composable configuration
- ✅ **Domain Specifics**: Covered by configuration extensions and custom behaviors

**Result**: 100% functionality can be expressed through configuration! 🎉
