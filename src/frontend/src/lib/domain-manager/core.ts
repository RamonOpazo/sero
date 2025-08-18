// Core Domain Manager Implementation
import type { 
  DomainManagerConfig, 
  DomainManager, 
  CoreState, 
  Action, 
  ActionMatcher,
  PendingChanges
} from './types';
import { BEHAVIORS } from './behaviors';
import type { Result } from '@/lib/result';

// =============================================================================
// FUNCTIONAL PATTERN MATCHING DISPATCHER
// =============================================================================

const createPatternMatchDispatcher = (actionMatchers: ActionMatcher) => {
  return (action: Action) => {
    const handler = actionMatchers[action.type];
    if (handler) {
      handler(null, action.payload); // state is managed internally
    } else {
      console.warn(`Unhandled action type: ${action.type}`);
    }
  };
};

// =============================================================================
// CORE DOMAIN MANAGER CLASS
// =============================================================================

export class CoreDomainManager<T, CreateT = Omit<T, 'id'>> implements DomainManager<T> {
  private state: CoreState<T> & Record<string, any>;
  private config: DomainManagerConfig<T, CreateT>;
  private listeners: Set<(state: any) => void> = new Set();
  private actionMatchers: ActionMatcher = {};
  private dispatchAction: (action: Action) => void;

  constructor(config: DomainManagerConfig<T, CreateT>, documentId: string) {
    this.config = config;
    
    // Initialize core state
    this.state = {
      // Core state
      savedItems: [],
      newItems: [],
      isLoading: false,
      isSaving: false,
      isCreating: false,
      error: null,
      documentId,
      initialState: {
        savedItems: [],
        newItems: [],
        timestamp: Date.now()
      },
      
      // Add behavior state extensions
      ...this.getBehaviorStateExtensions(),
      
      // Add custom extensions
      ...(config.extensions?.state || {})
    };

    // Build action matchers from behaviors
    this.buildActionMatchers();
    
    // Create functional pattern matcher
    this.dispatchAction = createPatternMatchDispatcher(this.actionMatchers);
    
    // Bind methods to state for behaviors
    this.bindMethodsToState();
    
    // Capture initial state
    this.dispatch({ type: 'CAPTURE_INITIAL_STATE' });
  }

  // =============================================================================
  // BEHAVIOR COMPOSITION
  // =============================================================================

  private getBehaviorStateExtensions(): Record<string, any> {
    const extensions: Record<string, any> = {};
    
    for (const behaviorKey of this.config.behaviors) {
      const behavior = BEHAVIORS[behaviorKey];
      if (behavior) {
        Object.assign(extensions, behavior.stateExtensions);
      }
    }
    
    return extensions;
  }

  private buildActionMatchers(): void {
    // Add behavior action handlers
    for (const behaviorKey of this.config.behaviors) {
      const behavior = BEHAVIORS[behaviorKey];
      if (behavior) {
        for (const [actionType, handler] of Object.entries(behavior.actionHandlers)) {
          this.actionMatchers[actionType] = (_state, payload) => {
            handler(this.state, payload);
            this.notify();
          };
        }
      }
    }
    
    // Add custom action handlers
    if (this.config.extensions?.actions) {
      for (const [actionType, handler] of Object.entries(this.config.extensions.actions)) {
        this.actionMatchers[actionType] = (_state, payload) => {
          handler(this.state, payload);
          this.notify();
        };
      }
    }
  }

  private bindMethodsToState(): void {
    // Bind behavior methods to state for cross-method access
    for (const behaviorKey of this.config.behaviors) {
      const behavior = BEHAVIORS[behaviorKey];
      if (behavior) {
        for (const [methodName, methodHandler] of Object.entries(behavior.methodExtensions)) {
          (this.state as any)[methodName] = (...args: any[]) => {
            return methodHandler(this.state, ...args);
          };
        }
      }
    }
    
    // Bind custom methods
    if (this.config.extensions?.methods) {
      for (const [methodName, methodHandler] of Object.entries(this.config.extensions.methods)) {
        (this.state as any)[methodName] = (...args: any[]) => {
          return methodHandler(this.state, ...args);
        };
      }
    }
    
    // Bind dispatch to state for behaviors that need it
    (this.state as any).dispatch = (action: Action) => this.dispatch(action);
    (this.state as any).entityName = this.config.entityName;
  }

  // =============================================================================
  // SUBSCRIPTION PATTERN
  // =============================================================================

  subscribe(listener: (state: any) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  getState(): any {
    return { ...this.state };
  }

  dispatch(action: Action): void {
    this.dispatchAction(action);
  }

  // =============================================================================
  // CORE OPERATIONS
  // =============================================================================

  async loadItems(): Promise<Result<T[], unknown>> {
    this.dispatch({ type: 'SET_LOADING', payload: true });
    this.dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const result = await this.config.api.fetch(this.state.documentId);
      
      if (result.ok) {
        // Transform items if needed
        const items = this.config.transforms.fromApi 
          ? result.value.map(this.config.transforms.fromApi)
          : result.value;
          
        this.dispatch({ type: 'LOAD_SAVED_ITEMS', payload: items });
        this.dispatch({ type: 'CAPTURE_INITIAL_STATE' });
      } else {
        this.dispatch({ type: 'SET_ERROR', payload: 'Failed to load items' });
      }
      
      this.dispatch({ type: 'SET_LOADING', payload: false });
      return result;
    } catch (error) {
      this.dispatch({ type: 'SET_ERROR', payload: 'Failed to load items' });
      this.dispatch({ type: 'SET_LOADING', payload: false });
      return { ok: false, error };
    }
  }

  async saveAllChanges(): Promise<Result<void, unknown>> {
    this.dispatch({ type: 'SET_SAVING', payload: true });
    this.dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const changes = this.getPendingChanges();
      
      // Process creates
      for (const item of changes.creates) {
        const createData = this.config.transforms.forCreate(item);
        const result = await this.config.api.create(this.state.documentId, createData);
        
        if (!result.ok) {
          this.dispatch({ type: 'SET_ERROR', payload: 'Failed to create item' });
          this.dispatch({ type: 'SET_SAVING', payload: false });
          return { ok: false, error: result.error };
        }
        
        // Replace in newItems with saved item
        const itemId = this.config.comparators.getId(item);
        this.state.newItems = this.state.newItems.filter(i => 
          this.config.comparators.getId(i) !== itemId
        );
        this.state.savedItems.push(result.value);
      }
      
      // Process updates
      for (const item of changes.updates) {
        const updateData = this.config.transforms.forUpdate(item);
        const itemId = this.config.comparators.getId(item);
        const result = await this.config.api.update(itemId, updateData);
        
        if (!result.ok) {
          this.dispatch({ type: 'SET_ERROR', payload: 'Failed to update item' });
          this.dispatch({ type: 'SET_SAVING', payload: false });
          return result;
        }
      }
      
      // Process deletes
      for (const item of changes.deletes) {
        const itemId = this.config.comparators.getId(item);
        const result = await this.config.api.delete(itemId);
        
        if (!result.ok) {
          this.dispatch({ type: 'SET_ERROR', payload: 'Failed to delete item' });
          this.dispatch({ type: 'SET_SAVING', payload: false });
          return result;
        }
      }
      
      // Commit changes and update initial state
      this.dispatch({ type: 'COMMIT_CHANGES' });
      this.dispatch({ type: 'SET_SAVING', payload: false });
      
      return { ok: true, value: undefined };
    } catch (error) {
      this.dispatch({ type: 'SET_ERROR', payload: 'Failed to save changes' });
      this.dispatch({ type: 'SET_SAVING', payload: false });
      return { ok: false, error };
    }
  }

  // =============================================================================
  // ITEM OPERATIONS (Delegated to CRUD behavior)
  // =============================================================================

  getAllItems(): T[] {
    return (this.state as any).getAllItems?.() || [];
  }

  getItemById(id: string): T | undefined {
    return (this.state as any).getItemById?.(id);
  }

  getItemCount(): number {
    return (this.state as any).getItemCount?.() || 0;
  }

  hasItems(): boolean {
    return (this.state as any).hasItems?.() || false;
  }

  // =============================================================================
  // CHANGE TRACKING (Delegated to changeTracking behavior)
  // =============================================================================

  getPendingChanges(): PendingChanges<T> {
    return (this.state as any).getPendingChanges?.() || { creates: [], updates: [], deletes: [] };
  }

  getPendingChangesCount(): number {
    return (this.state as any).getPendingChangesCount?.() || 0;
  }

  hasUnsavedChanges(): boolean {
    return (this.state as any).hasUnsavedChanges?.() || false;
  }
}
