# Domain Manager Architecture - Core Concepts

## Overview

The Domain Manager is a declarative, composable state management system designed for CRUD operations with rich behavioral composition. It follows functional programming principles with strict type safety and separation of concerns.

## Core Principles

### 1. Strict Separation of Concerns
- **State Management**: Pure data transformations
- **Action Handling**: Side-effect free state mutations
- **Behavior Composition**: Modular, orthogonal capabilities
- **API Integration**: External system interactions
- **Type Safety**: Compile-time guarantees

### 2. Declarative Configuration
- All behavior is declared through configuration
- No imperative state manipulation
- Composable behavior modules
- Type-safe action dispatching

### 3. Functional Approach
- Immutable state transformations
- Pure functions for all operations
- Predictable state transitions
- No hidden side effects

### 4. Generic Design
- Context-agnostic terminology
- CRUD naming conventions
- Domain-independent operations
- Reusable across any entity type

## System Architecture

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Configuration │--->│  Domain Manager │--->│   Application   │
│     (Static)    │    │    (Runtime)    │    │     (React)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         V                       V                       V
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Behaviors    │    │  State Machine  │    │  UI Components  │
│   (Modular)     │    │  (Predictable)  │    │   (Reactive)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Message System (Actions)

### Action Categories

All actions in the system fall into these categories, each with specific responsibilities:

#### 1. **CRUD Operations** (`CrudAction`)
```typescript
enum CrudActionType {
  // Loading states
  SET_LOADING = 'SET_LOADING',
  SET_SAVING = 'SET_SAVING', 
  SET_CREATING = 'SET_CREATING',
  SET_ERROR = 'SET_ERROR',
  
  // Basic CRUD operations
  LOAD_ITEMS = 'LOAD_ITEMS',
  CREATE_ITEM = 'CREATE_ITEM',
  READ_ITEM = 'READ_ITEM',
  UPDATE_ITEM = 'UPDATE_ITEM',
  DELETE_ITEM = 'DELETE_ITEM',
  
  // Bulk operations
  CREATE_ITEMS = 'CREATE_ITEMS',
  UPDATE_ITEMS = 'UPDATE_ITEMS',
  DELETE_ITEMS = 'DELETE_ITEMS',
  
  // Context operations
  CLEAR_LOCAL_CONTEXT = 'CLEAR_LOCAL_CONTEXT',
  CLEAR_GLOBAL_CONTEXT = 'CLEAR_GLOBAL_CONTEXT'
}
```

#### 2. **History Operations** (`HistoryAction`)
```typescript
enum HistoryActionType {
  UNDO = 'UNDO',
  REDO = 'REDO',
  RECORD_CHANGE = 'RECORD_CHANGE',
  CLEAR_HISTORY = 'CLEAR_HISTORY',
  TRUNCATE_HISTORY = 'TRUNCATE_HISTORY'
}
```

#### 3. **Focus Operations** (`FocusAction`)
```typescript
enum FocusActionType {
  SET_FOCUSED_ITEM = 'SET_FOCUSED_ITEM',
  CLEAR_FOCUSED_ITEM = 'CLEAR_FOCUSED_ITEM',
  SET_FOCUSED_ITEMS = 'SET_FOCUSED_ITEMS',
  TOGGLE_ITEM_FOCUS = 'TOGGLE_ITEM_FOCUS'
}
```

#### 4. **Draft Operations** (`DraftAction`)
```typescript
enum DraftActionType {
  START_DRAFT = 'START_DRAFT',
  UPDATE_DRAFT = 'UPDATE_DRAFT',
  COMMIT_DRAFT = 'COMMIT_DRAFT',
  DISCARD_DRAFT = 'DISCARD_DRAFT'
}
```

#### 5. **Change Tracking Operations** (`ChangeTrackingAction`)
```typescript
enum ChangeTrackingActionType {
  CAPTURE_BASELINE = 'CAPTURE_BASELINE',
  COMMIT_CHANGES = 'COMMIT_CHANGES',
  DISCARD_CHANGES = 'DISCARD_CHANGES',
  RESET_TO_BASELINE = 'RESET_TO_BASELINE'
}
```

#### 6. **Batch Operations** (`BatchAction`)
```typescript
enum BatchActionType {
  BEGIN_BATCH = 'BEGIN_BATCH',
  END_BATCH = 'END_BATCH',
  EXECUTE_BATCH = 'EXECUTE_BATCH',
  ROLLBACK_BATCH = 'ROLLBACK_BATCH'
}
```

#### 7. **Context Operations** (`ContextAction`)
```typescript
enum ContextActionType {
  SET_CONTEXT = 'SET_CONTEXT',
  CLEAR_CONTEXT = 'CLEAR_CONTEXT',
  SWITCH_CONTEXT = 'SWITCH_CONTEXT',
  FILTER_BY_CONTEXT = 'FILTER_BY_CONTEXT'
}
```

### Action Union Type
```typescript
type DomainAction = 
  | CrudAction 
  | HistoryAction 
  | FocusAction 
  | DraftAction 
  | ChangeTrackingAction 
  | BatchAction
  | ContextAction;
```

## State Structure

### Core State Interface
```typescript
interface CoreDomainState<TItem> {
  // Item collections
  readonly persistedItems: ReadonlyArray<TItem>;
  readonly draftItems: ReadonlyArray<TItem>;
  
  // Operation states
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly isCreating: boolean;
  readonly isBatching: boolean;
  
  // Error handling
  readonly error: string | null;
  readonly warnings: ReadonlyArray<string>;
  
  // Context
  readonly contextId: string;
  readonly metadata: ReadonlyMap<string, unknown>;
  
  // Change tracking
  readonly baseline: StateSnapshot<TItem>;
}

interface StateSnapshot<TItem> {
  readonly persistedItems: ReadonlyArray<TItem>;
  readonly draftItems: ReadonlyArray<TItem>;
  readonly timestamp: number;
  readonly version: number;
}
```

### Behavior State Extensions
```typescript
interface BehaviorStateExtension {
  readonly [key: string]: unknown;
}
```

## Behavior System

### Behavior Interface
```typescript
interface Behavior<TState = any> {
  readonly name: BehaviorName;
  readonly stateExtensions: BehaviorStateExtension;
  readonly actionHandlers: ActionHandlerMap<TState>;
  readonly methodExtensions: MethodExtensionMap<TState>;
  readonly dependencies?: ReadonlyArray<BehaviorName>;
  readonly priority: number;
}
```

### Behavior Names (Enum)
```typescript
enum BehaviorName {
  CRUD = 'crud',
  CHANGE_TRACKING = 'changeTracking',
  HISTORY = 'history', 
  HISTORY_INTEGRATION = 'historyIntegration',
  FOCUS_MANAGEMENT = 'focusManagement',
  DRAFT_MANAGEMENT = 'draftManagement',
  BATCH_OPERATIONS = 'batchOperations',
  CONTEXT_OPERATIONS = 'contextOperations',
  BULK_OPERATIONS = 'bulkOperations'
}
```

### Action Handler Map
```typescript
type ActionHandlerMap<TState> = {
  readonly [K in ActionType]?: ActionHandler<TState, ActionPayload<K>>;
};

type ActionHandler<TState, TPayload> = (
  state: TState, 
  payload: TPayload,
  context: ActionContext
) => void;

interface ActionContext {
  readonly timestamp: number;
  readonly source: ActionSource;
  readonly metadata?: ReadonlyMap<string, unknown>;
}

enum ActionSource {
  USER = 'user',
  SYSTEM = 'system',
  API = 'api',
  BATCH = 'batch'
}
```

## Type Safety Guarantees

### Action Type Safety
```typescript
// Each action type has a specific payload type
interface ActionPayloadMap<TItem> {
  [CrudActionType.CREATE_ITEM]: TItem;
  [CrudActionType.UPDATE_ITEM]: { 
    readonly id: string; 
    readonly updates: Partial<TItem> 
  };
  [CrudActionType.DELETE_ITEM]: string;
  [CrudActionType.CLEAR_GLOBAL_CONTEXT]: void;
  [CrudActionType.CLEAR_LOCAL_CONTEXT]: { readonly contextFilter?: string };
  [HistoryActionType.UNDO]: void;
  [HistoryActionType.REDO]: void;
  [FocusActionType.SET_FOCUSED_ITEM]: string | null;
  [DraftActionType.START_DRAFT]: Partial<TItem>;
  // ... etc
}

// Dispatch function is fully type-safe
type Dispatch<TItem> = <K extends keyof ActionPayloadMap<TItem>>(
  actionType: K,
  payload: ActionPayloadMap<TItem>[K]
) => void;
```

### State Type Safety
```typescript
// State is read-only outside of action handlers
type ReadOnlyState<T> = {
  readonly [P in keyof T]: T[P] extends Array<infer U> 
    ? ReadonlyArray<U> 
    : T[P] extends Map<infer K, infer V>
    ? ReadonlyMap<K, V>
    : T[P];
};
```

## Configuration Interface

### Domain Manager Config
```typescript
interface DomainManagerConfig<TItem, TCreateData = Omit<TItem, 'id'>> {
  // Domain identification
  readonly domain: string;
  readonly entityName: string;
  
  // API integration
  readonly api: ApiAdapter<TItem, TCreateData>;
  readonly transforms: DataTransforms<TItem, TCreateData>;
  readonly comparators: ItemComparators<TItem>;
  
  // Behavior composition
  readonly behaviors: ReadonlyArray<BehaviorName>;
  
  // Configuration
  readonly options?: DomainOptions;
  
  // Extensions
  readonly extensions?: {
    readonly state?: BehaviorStateExtension;
    readonly actions?: ActionHandlerMap<any>;
    readonly methods?: MethodExtensionMap<any>;
  };
}

interface DomainOptions {
  readonly historyLimit?: number;
  readonly batchSize?: number;
  readonly autoSave?: boolean;
  readonly strictMode?: boolean;
  readonly debugMode?: boolean;
}
```

### API Adapter Interface
```typescript
interface ApiAdapter<TItem, TCreateData> {
  readonly fetch: (contextId: string) => Promise<Result<ReadonlyArray<TItem>, ApiError>>;
  readonly create: (contextId: string, data: TCreateData) => Promise<Result<TItem, ApiError>>;
  readonly update: (id: string, data: Partial<TItem>) => Promise<Result<TItem, ApiError>>;
  readonly delete: (id: string) => Promise<Result<void, ApiError>>;
  readonly batchCreate?: (contextId: string, data: ReadonlyArray<TCreateData>) => Promise<Result<ReadonlyArray<TItem>, ApiError>>;
  readonly batchUpdate?: (updates: ReadonlyArray<{ id: string; data: Partial<TItem> }>) => Promise<Result<ReadonlyArray<TItem>, ApiError>>;
  readonly batchDelete?: (ids: ReadonlyArray<string>) => Promise<Result<void, ApiError>>;
}
```

## Error Handling Strategy

### Result Type
```typescript
type Result<TSuccess, TError> = 
  | { readonly ok: true; readonly value: TSuccess; readonly warnings?: ReadonlyArray<string> }
  | { readonly ok: false; readonly error: TError; readonly recovery?: RecoveryOptions };

interface RecoveryOptions {
  readonly canRetry: boolean;
  readonly retryDelay?: number;
  readonly fallbackAction?: ActionType;
}
```

### Error Categories
```typescript
enum ErrorType {
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error', 
  PERMISSION_ERROR = 'permission_error',
  NOT_FOUND_ERROR = 'not_found_error',
  CONFLICT_ERROR = 'conflict_error',
  QUOTA_EXCEEDED_ERROR = 'quota_exceeded_error',
  UNKNOWN_ERROR = 'unknown_error'
}

interface ApiError {
  readonly type: ErrorType;
  readonly message: string;
  readonly code?: string;
  readonly details?: ReadonlyMap<string, unknown>;
  readonly timestamp: number;
}
```

This covers the core concepts. The second file will detail the specific behavior implementations and execution flow.
