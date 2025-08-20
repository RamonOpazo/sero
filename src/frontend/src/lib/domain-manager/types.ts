// Domain Manager Library Types
import type { Result } from '@/lib/result';

// =============================================================================
// CORE CONFIGURATION TYPES
// =============================================================================

export interface DomainManagerConfig<T, CreateT = Omit<T, 'id'>> {
  // Domain identification
  domain: string;
  entityName: string;
  
  // API integration
  api: ApiAdapter<T, CreateT>;
  transforms: ApiTransforms<T, CreateT>;
  comparators: Comparators<T>;
  
  // Behavior composition
  behaviors: BehaviorKey[];
  
  // Extensions for domain-specific needs
  extensions?: {
    state?: Record<string, any>;
    actions?: Record<string, ActionHandler>;
    methods?: Record<string, MethodHandler>;
  };
}

// =============================================================================
// API ADAPTER INTERFACE
// =============================================================================

export interface ApiAdapter<T, CreateT> {
  fetch: (documentId: string) => Promise<Result<T[], unknown>>;
  create: (documentId: string, data: CreateT) => Promise<Result<T, unknown>>;
  update: (id: string, data: Partial<T>) => Promise<Result<void, unknown>>;
  delete: (id: string) => Promise<Result<void, unknown>>;
}

export interface ApiTransforms<T, CreateT> {
  forCreate: (item: T) => CreateT;
  forUpdate: (item: T) => Partial<T>;
  fromApi?: (apiItem: any) => T;
}

export interface Comparators<T> {
  getId: (item: T) => string;
  areEqual: (a: T, b: T) => boolean;
}

// =============================================================================
// BEHAVIOR SYSTEM
// =============================================================================

export type BehaviorKey = 
  | 'crud'
  | 'changeTracking' 
  | 'history'
  | 'drawing'
  | 'selection'
  | 'batchOperations'
  | 'pageOperations'
  | 'bulkOperations';

export interface Behavior {
  name: BehaviorKey;
  stateExtensions: Record<string, any>;
  actionHandlers: Record<string, ActionHandler>;
  methodExtensions: Record<string, MethodHandler>;
}

// =============================================================================
// ACTION SYSTEM
// =============================================================================

export interface Action<T = any> {
  type: string;
  payload?: T;
}

export type ActionHandler = (state: any, payload?: any) => void;

export type MethodHandler = (state: any, ...args: any[]) => any;

// =============================================================================
// CORE STATE INTERFACE
// =============================================================================

export interface CoreState<T> {
  // Data management
  savedItems: T[];
  newItems: T[];
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isCreating: boolean;
  
  // Error handling
  error: string | null;
  
  // Context
  documentId: string;
  
  // Change tracking
  initialState: StateSnapshot<T>;
}

export interface StateSnapshot<T> {
  savedItems: T[];
  newItems: T[];
  timestamp: number;
}

// =============================================================================
// PENDING CHANGES
// =============================================================================

export interface PendingChanges<T> {
  creates: T[];
  updates: T[];
  deletes: T[];
}

// =============================================================================
// MANAGER INTERFACE
// =============================================================================

export interface DomainManager<T> {
  // State access
  getState(): any;
  
  // Subscription
  subscribe(listener: (state: any) => void): () => void;
  
  // Core operations
  loadItems(): Promise<Result<T[], unknown>>;
  saveAllChanges(): Promise<Result<void, unknown>>;
  
  // Item operations
  getAllItems(): T[];
  getItemById(id: string): T | undefined;
  getItemCount(): number;
  hasItems(): boolean;
  
  // Change tracking
  getPendingChanges(): PendingChanges<T>;
  getPendingChangesCount(): number;
  hasUnsavedChanges(): boolean;
  
  // Actions
  dispatch(action: Action): void;
}

// =============================================================================
// FUNCTIONAL PATTERN MATCHING
// =============================================================================

export type ActionMatcher = {
  [actionType: string]: ActionHandler;
};

export type PatternMatchDispatcher = (action: Action, matchers: ActionMatcher) => void;
