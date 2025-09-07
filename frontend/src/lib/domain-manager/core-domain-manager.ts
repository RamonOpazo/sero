// Domain Manager V2 - Core Implementation
// Main domain manager class with behavior composition and type-safe dispatch

import type { Result } from '../result';
import type {
  DomainManagerConfig,
  DomainManager,
  CoreDomainState,
  ReadOnlyState,
  PendingChanges,
  HandlerExecution
} from './state-types';
import type { ActionType, ActionContext, ActionPayloadMap } from './action-types';
import { ActionSource } from './action-types';
import { getBehaviors, validateBehaviorDependencies, sortBehaviorsByPriority } from './behavior-registry';

// =============================================================================
// CORE DOMAIN MANAGER IMPLEMENTATION
// =============================================================================

export class CoreDomainManager<TItem, TCreateData = Omit<TItem, 'id'>> implements DomainManager<TItem> {
  private state: CoreDomainState<TItem> & Record<string, unknown>;
  private config: DomainManagerConfig<TItem, TCreateData>;
  private listeners: Set<(state: ReadOnlyState<CoreDomainState<TItem> & Record<string, unknown>>) => void> = new Set();
  private actionHandlers: Map<ActionType, ReadonlyArray<HandlerExecution<any>>> = new Map();

  constructor(config: DomainManagerConfig<TItem, TCreateData>, contextId: string) {
    this.config = config;
    
    // Validate behavior dependencies
    const validation = validateBehaviorDependencies(config.behaviors);
    if (!validation.isValid) {
      throw new Error(`Invalid behavior configuration: ${validation.missingDependencies.join(', ')}`);
    }
    
    // Initialize core state
    this.state = {
      // Core state
      persistedItems: [],
      draftItems: [],
      isLoading: false,
      isSaving: false,
      isCreating: false,
      isBatching: false,
      error: null,
      warnings: [],
      contextId,
      metadata: new Map(),
      baseline: {
        persistedItems: [],
        draftItems: [],
        timestamp: Date.now(),
        version: 0
      },
      
      // Add behavior state extensions
      ...this.getBehaviorStateExtensions(),
      
      // Add custom extensions
      ...(config.extensions?.state || {})
    } as CoreDomainState<TItem> & Record<string, unknown>;

    // Build action handlers from behaviors
    this.buildActionHandlers();
    
    // Bind methods to state for behaviors
    this.bindMethodsToState();
    
    // Capture initial baseline if change tracking behavior is enabled
    if (this.config.behaviors.includes('changeTracking' as any)) {
      this.dispatch('CAPTURE_BASELINE' as any, undefined as any);
    }
  }

  // =============================================================================
  // BEHAVIOR COMPOSITION
  // =============================================================================

  private getBehaviorStateExtensions(): Record<string, unknown> {
    const extensions: Record<string, unknown> = {};
    const behaviors = getBehaviors(this.config.behaviors);
    
    for (const behavior of behaviors) {
      if (behavior) {
        Object.assign(extensions, behavior.stateExtensions);
      }
    }
    
    return extensions;
  }

  private buildActionHandlers(): void {
    const behaviors = getBehaviors(this.config.behaviors);
    const sortedBehaviors = sortBehaviorsByPriority(behaviors);
    
    // Group handlers by action type
    const handlerGroups: Record<string, HandlerExecution<any>[]> = {};
    
    // Add behavior action handlers
    for (const behavior of sortedBehaviors) {
      if (behavior) {
        for (const [actionType, handler] of Object.entries(behavior.actionHandlers)) {
          if (!handlerGroups[actionType]) {
            handlerGroups[actionType] = [];
          }
          
          handlerGroups[actionType].push({
            behavior: behavior.name,
            priority: behavior.priority,
            handler
          });
        }
      }
    }
    
    // Add custom action handlers
    if (this.config.extensions?.actions) {
      for (const [actionType, handler] of Object.entries(this.config.extensions.actions)) {
        if (!handlerGroups[actionType]) {
          handlerGroups[actionType] = [];
        }
        
        handlerGroups[actionType].push({
          behavior: 'custom' as any,
          priority: 999, // Custom handlers run last
          handler
        });
      }
    }
    
    // Sort each handler group by priority and store in map
    for (const [actionType, handlers] of Object.entries(handlerGroups)) {
      const sortedHandlers = handlers.sort((a, b) => a.priority - b.priority);
      this.actionHandlers.set(actionType as ActionType, sortedHandlers);
    }
  }

  private bindMethodsToState(): void {
    const behaviors = getBehaviors(this.config.behaviors);
    
    // Bind behavior methods to state for cross-method access
    for (const behavior of behaviors) {
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
    (this.state as any).dispatch = <K extends keyof ActionPayloadMap<TItem>>(
      actionType: K,
      payload: ActionPayloadMap<TItem>[K]
    ) => this.dispatch(actionType, payload);
  }

  // =============================================================================
  // PUBLIC API - DOMAIN MANAGER INTERFACE
  // =============================================================================

  getState(): ReadOnlyState<CoreDomainState<TItem> & Record<string, unknown>> {
    // Return a deep readonly copy of the state
    return JSON.parse(JSON.stringify(this.state)) as ReadOnlyState<CoreDomainState<TItem> & Record<string, unknown>>;
  }

  subscribe(listener: (state: ReadOnlyState<CoreDomainState<TItem> & Record<string, unknown>>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispatch = <K extends keyof ActionPayloadMap<TItem>>(
    actionType: K,
    payload: ActionPayloadMap<TItem>[K]
  ): void => {
    const context: ActionContext = {
      timestamp: Date.now(),
      source: ActionSource.USER,
      metadata: new Map()
    };
    
    this.executeAction(actionType as ActionType, payload, context);
    this.notifyListeners();
  };

  // =============================================================================
  // CORE OPERATIONS
  // =============================================================================

  async load(): Promise<Result<ReadonlyArray<TItem>, unknown>> {
    this.dispatch('SET_LOADING' as any, true);
    this.dispatch('SET_ERROR' as any, null);
    
    try {
      const result = await this.config.api.fetch(this.state.contextId);
      
      if (result.ok) {
        // Transform items if needed
        const items = this.config.transforms.fromApi 
          ? result.value.map(this.config.transforms.fromApi)
          : result.value;
          
        this.dispatch('LOAD_ITEMS' as any, items);
        
        // Capture baseline if change tracking is enabled
        if (this.config.behaviors.includes('changeTracking' as any)) {
          this.dispatch('CAPTURE_BASELINE' as any, undefined as any);
        }
      } else {
        this.dispatch('SET_ERROR' as any, 'Failed to load items');
      }
      
      this.dispatch('SET_LOADING' as any, false);
      return result;
    } catch (error) {
      this.dispatch('SET_ERROR' as any, 'Failed to load items');
      this.dispatch('SET_LOADING' as any, false);
      return { ok: false, error: error };
    }
  }

  async save(): Promise<Result<void, unknown>> {
    return this.saveAllChanges();
  }

  async saveAllChanges(): Promise<Result<void, unknown>> {
    this.dispatch('SET_SAVING' as any, true);
    this.dispatch('SET_ERROR' as any, null);
    
    try {
      const changes = this.getPendingChanges();
      
      // Process creates
      for (const item of changes.creates) {
        const createData = this.config.transforms.forCreate(item);
        const result = await this.config.api.create(this.state.contextId, createData);
        
        if (!result.ok) {
          this.dispatch('SET_ERROR' as any, 'Failed to create item');
          this.dispatch('SET_SAVING' as any, false);
          return { ok: false, error: (result as any).error };
        }
        
        // Replace in draftItems with saved item
        const itemId = this.config.comparators.getId(item);
        (this.state as any).draftItems = this.state.draftItems.filter(i => 
          this.config.comparators.getId(i) !== itemId
        );
        (this.state as any).persistedItems = [...this.state.persistedItems, result.value];
      }
      
      // Process updates
      for (const item of changes.updates) {
        const updateData = this.config.transforms.forUpdate(item);
        const itemId = this.config.comparators.getId(item);
        const result = await this.config.api.update(itemId, updateData);
        
        if (!result.ok) {
          this.dispatch('SET_ERROR' as any, 'Failed to update item');
          this.dispatch('SET_SAVING' as any, false);
          return result as any;
        }
      }
      
      // Process deletes
      for (const item of changes.deletes) {
        const itemId = this.config.comparators.getId(item);
        const result = await this.config.api.delete(itemId);
        
        if (!result.ok) {
          this.dispatch('SET_ERROR' as any, 'Failed to delete item');
          this.dispatch('SET_SAVING' as any, false);
          return result as any;
        }
      }
      
      // Commit changes and update baseline
      this.dispatch('COMMIT_CHANGES' as any, undefined as any);
      // After a successful save and commit, reset history so we start clean
      this.dispatch('CLEAR_HISTORY' as any, undefined as any);
      this.dispatch('SET_SAVING' as any, false);
      
      return { ok: true, value: undefined };
    } catch (error) {
      this.dispatch('SET_ERROR' as any, 'Failed to save changes');
      this.dispatch('SET_SAVING' as any, false);
      return { ok: false, error: error };
    }
  }

  // =============================================================================
  // ITEM OPERATIONS (Delegated to behaviors)
  // =============================================================================

  getAllItems(): ReadonlyArray<TItem> {
    return (this.state as any).getAllItems?.() || [];
  }

  getItemById(id: string): TItem | undefined {
    return (this.state as any).getItemById?.(id);
  }

  getItemCount(): number {
    return (this.state as any).getItemCount?.() || 0;
  }

  hasItems(): boolean {
    return (this.state as any).hasItems?.() || false;
  }

  // =============================================================================
  // CHANGE TRACKING (Delegated to behaviors)
  // =============================================================================

  getPendingChanges(): PendingChanges<TItem> {
    return (this.state as any).getPendingChanges?.() || { creates: [], updates: [], deletes: [] };
  }

  getPendingChangesCount(): number {
    return (this.state as any).getPendingChangesCount?.() || 0;
  }

  hasUnsavedChanges(): boolean {
    return (this.state as any).hasUnsavedChanges?.() || false;
  }

  // =============================================================================
  // HISTORY (Delegated to behaviors)
  // =============================================================================

  getChangeHistory(): ReadonlyArray<any> {
    return (this.state as any).getChangeHistory?.() || [];
  }

  getHistoryPosition(): number {
    return (this.state as any).getHistoryPosition?.() || 0;
  }

  // =============================================================================
  // INTERNAL METHODS
  // =============================================================================

  private executeAction(actionType: ActionType, payload: unknown, context: ActionContext): void {
    const handlers = this.actionHandlers.get(actionType);
    
    if (!handlers) {
      if (this.config.options?.debugMode) {
        console.warn(`No handlers found for action type: ${actionType}`);
      }
      return;
    }
    
    // Execute all handlers in priority order
    for (const { handler } of handlers) {
      try {
        handler(this.state, payload, context);
      } catch (error) {
        console.error(`Error executing handler for ${actionType}:`, error);
        if (this.config.options?.strictMode) {
          throw error;
        }
      }
    }
  }

  private notifyListeners(): void {
    const readOnlyState = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(readOnlyState);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }
}
