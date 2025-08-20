// Domain Manager V2 - Core State and Configuration Types
// Immutable state structures with strict type safety

import type { Result } from '../../result';
import type { ActionContext, ActionType, ActionPayloadMap, Dispatch } from './action-types';

// =============================================================================
// CORE STATE INTERFACE
// =============================================================================

export interface CoreDomainState<TItem> {
  // Item collections (renamed from savedItems/newItems to persistedItems/draftItems)
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
  
  // Context (renamed from documentId to contextId for generic usage)
  readonly contextId: string;
  readonly metadata: ReadonlyMap<string, unknown>;
  
  // Change tracking (renamed from initialState to baseline)
  readonly baseline: StateSnapshot<TItem>;
}

// =============================================================================
// STATE SNAPSHOT
// =============================================================================

export interface StateSnapshot<TItem> {
  readonly persistedItems: ReadonlyArray<TItem>;
  readonly draftItems: ReadonlyArray<TItem>;
  readonly timestamp: number;
  readonly version: number;
}

// =============================================================================
// BEHAVIOR STATE EXTENSION
// =============================================================================

export interface BehaviorStateExtension {
  readonly [key: string]: unknown;
}

// =============================================================================
// DOMAIN MANAGER CONFIGURATION
// =============================================================================

export interface DomainManagerConfig<TItem, TCreateData = Omit<TItem, 'id'>> {
  // Domain identification
  readonly domain: string;
  readonly entityName: string;
  
  // API integration
  readonly api: ApiAdapter<TItem, TCreateData>;
  readonly transforms: DataTransforms<TItem, TCreateData>;
  readonly comparators: ItemComparators<TItem>;
  
  // Behavior composition
  readonly behaviors: ReadonlyArray<BehaviorName>;
  
  // Configuration options
  readonly options?: DomainOptions;
  
  // Extensions for domain-specific needs
  readonly extensions?: {
    readonly state?: BehaviorStateExtension;
    readonly actions?: ActionHandlerMap<any>;
    readonly methods?: MethodExtensionMap<any>;
  };
}

// =============================================================================
// DOMAIN OPTIONS
// =============================================================================

export interface DomainOptions {
  readonly historyLimit?: number;
  readonly batchSize?: number;
  readonly autoSave?: boolean;
  readonly strictMode?: boolean;
  readonly debugMode?: boolean;
}

// =============================================================================
// API ADAPTER INTERFACE
// =============================================================================

export interface ApiAdapter<TItem, TCreateData> {
  readonly fetch: (contextId: string) => Promise<Result<ReadonlyArray<TItem>, unknown>>;
  readonly create: (contextId: string, data: TCreateData) => Promise<Result<TItem, unknown>>;
  readonly update: (id: string, data: Partial<TItem>) => Promise<Result<TItem, unknown>>;
  readonly delete: (id: string) => Promise<Result<void, unknown>>;
  readonly batchCreate?: (contextId: string, data: ReadonlyArray<TCreateData>) => Promise<Result<ReadonlyArray<TItem>, unknown>>;
  readonly batchUpdate?: (updates: ReadonlyArray<{ id: string; data: Partial<TItem> }>) => Promise<Result<ReadonlyArray<TItem>, unknown>>;
  readonly batchDelete?: (ids: ReadonlyArray<string>) => Promise<Result<void, unknown>>;
}

// =============================================================================
// DATA TRANSFORMS
// =============================================================================

export interface DataTransforms<TItem, TCreateData> {
  readonly forCreate: (item: TItem) => TCreateData;
  readonly forUpdate: (item: TItem) => Partial<TItem>;
  readonly fromApi?: (apiItem: unknown) => TItem;
}

// =============================================================================
// ITEM COMPARATORS
// =============================================================================

export interface ItemComparators<TItem> {
  readonly getId: (item: TItem) => string;
  readonly areEqual: (a: TItem, b: TItem) => boolean;
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

export const ErrorType = {
  NETWORK_ERROR: 'network_error',
  VALIDATION_ERROR: 'validation_error',
  PERMISSION_ERROR: 'permission_error',
  NOT_FOUND_ERROR: 'not_found_error',
  CONFLICT_ERROR: 'conflict_error',
  QUOTA_EXCEEDED_ERROR: 'quota_exceeded_error',
  UNKNOWN_ERROR: 'unknown_error'
} as const;

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];

export interface ApiError {
  readonly type: ErrorType;
  readonly message: string;
  readonly code?: string;
  readonly details?: ReadonlyMap<string, unknown>;
  readonly timestamp: number;
}

export interface RecoveryOptions {
  readonly canRetry: boolean;
  readonly retryDelay?: number;
  readonly fallbackAction?: ActionType;
}

// =============================================================================
// BEHAVIOR SYSTEM
// =============================================================================

export const BehaviorName = {
  CRUD: 'crud',
  CHANGE_TRACKING: 'changeTracking',
  HISTORY: 'history',
  HISTORY_INTEGRATION: 'historyIntegration',
  FOCUS_MANAGEMENT: 'focusManagement',
  DRAFT_MANAGEMENT: 'draftManagement',
  BATCH_OPERATIONS: 'batchOperations',
  CONTEXT_OPERATIONS: 'contextOperations',
  BULK_OPERATIONS: 'bulkOperations'
} as const;

export type BehaviorName = typeof BehaviorName[keyof typeof BehaviorName];

export interface Behavior<TState = any> {
  readonly name: BehaviorName;
  readonly priority: number;
  readonly stateExtensions: BehaviorStateExtension;
  readonly actionHandlers: ActionHandlerMap<TState>;
  readonly methodExtensions: MethodExtensionMap<TState>;
  readonly dependencies?: ReadonlyArray<BehaviorName>;
}

// =============================================================================
// ACTION HANDLING
// =============================================================================

export type ActionHandler<TState, TPayload> = (
  state: TState,
  payload: TPayload,
  context: ActionContext
) => void;

export type ActionHandlerMap<TState> = {
  readonly [K in ActionType]?: ActionHandler<TState, ActionPayloadMap<any>[K]>;
};

export type MethodHandler<TState> = (state: TState, ...args: any[]) => any;

export type MethodExtensionMap<TState> = {
  readonly [methodName: string]: MethodHandler<TState>;
};

// =============================================================================
// PENDING CHANGES
// =============================================================================

export interface PendingChanges<TItem> {
  readonly creates: ReadonlyArray<TItem>;
  readonly updates: ReadonlyArray<TItem>;
  readonly deletes: ReadonlyArray<TItem>;
}

export interface ChangesSummary {
  readonly createCount: number;
  readonly updateCount: number;
  readonly deleteCount: number;
  readonly totalCount: number;
}

// =============================================================================
// VALIDATION
// =============================================================================

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
}

// =============================================================================
// DOMAIN MANAGER INTERFACE
// =============================================================================

export interface DomainManager<TItem> {
  // State access (immutable)
  getState(): ReadOnlyState<CoreDomainState<TItem> & Record<string, unknown>>;
  
  // Subscription
  subscribe(listener: (state: ReadOnlyState<CoreDomainState<TItem> & Record<string, unknown>>) => void): () => void;
  
  // Type-safe dispatch
  dispatch: Dispatch<TItem>;
  
  // Core operations
  load(): Promise<Result<ReadonlyArray<TItem>, unknown>>;
  save(): Promise<Result<void, unknown>>;
  
  // Item operations (delegated to behaviors)
  getAllItems(): ReadonlyArray<TItem>;
  getItemById(id: string): TItem | undefined;
  getItemCount(): number;
  hasItems(): boolean;
  
  // Change tracking (delegated to behaviors)
  getPendingChanges(): PendingChanges<TItem>;
  getPendingChangesCount(): number;
  hasUnsavedChanges(): boolean;
}

// =============================================================================
// READ-ONLY STATE TYPE
// =============================================================================

export type ReadOnlyState<T> = {
  readonly [P in keyof T]: T[P] extends Array<infer U>
    ? ReadonlyArray<U>
    : T[P] extends Map<infer K, infer V>
    ? ReadonlyMap<K, V>
    : T[P] extends Set<infer S>
    ? ReadonlySet<S>
    : T[P];
};

// =============================================================================
// HANDLER EXECUTION
// =============================================================================

export interface HandlerExecution<TState> {
  readonly behavior: BehaviorName;
  readonly priority: number;
  readonly handler: ActionHandler<TState, any>;
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

export interface BatchOperation {
  readonly type: ActionType;
  readonly payload: unknown;
  readonly timestamp: number;
}
