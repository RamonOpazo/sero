/**
 * Ultra-Declarative Manager Configuration System
 * 
 * This approach moves ALL logic to external, reusable configurations,
 * making managers pure data declarations with zero implementation code.
 */

import type { Result } from '@/lib/result';

// Core configuration interfaces
export interface DomainConfig<T, CreateT> {
  domain: string;
  entityType: new() => T;
  createType: new() => CreateT;
}

export interface StateConfig<T> {
  coreCollections: {
    saved: string;    // e.g., 'savedPrompts'
    new: string;      // e.g., 'newPrompts'
  };
  loadingStates: string[];
  errorStates: string[];
  contextFields: string[];
  customFields?: Record<string, any>;
}

export interface ActionConfig {
  standard: {
    loading: string[];
    crud: string[];
    bulk: string[];
  };
  custom?: string[];
}

export interface ApiConfig<T, CreateT> {
  endpoints: {
    fetch: string;
    create: string;
    update: string;
    delete: string;
  };
  transforms: {
    forCreate: (item: T) => CreateT;
    forUpdate: (item: T) => Partial<T>;
    fromApi?: (apiItem: any) => T;
  };
}

export interface BehaviorConfig {
  history?: {
    enabled: boolean;
    maxSize: number;
    withUndoRedo?: boolean;
  };
  drawing?: {
    enabled: boolean;
    trackCurrent: boolean;
    autoGenId: boolean;
  };
  selection?: {
    enabled: boolean;
    trackSelected: boolean;
  };
  batching?: {
    enabled: boolean;
    autoHistory: boolean;
  };
  pages?: {
    enabled: boolean;
    supportPageOperations: boolean;
  };
}

export interface ComparatorConfig<T> {
  getId: (item: T) => string;
  areEqual: (a: T, b: T) => boolean;
  compare?: (a: T, b: T) => number;
}

export interface ManagerConfig<T, CreateT> {
  domain: DomainConfig<T, CreateT>;
  state: StateConfig<T>;
  actions: ActionConfig;
  api: ApiConfig<T, CreateT>;
  behaviors: BehaviorConfig;
  comparator: ComparatorConfig<T>;
}

// Behavior composition functions
export type BehaviorFunction<T> = {
  extendState?: (baseState: any) => any;
  extendActions?: (baseActions: any[]) => any[];
  createHandlers?: (config: ManagerConfig<T, any>) => Record<string, Function>;
  createMethods?: (config: ManagerConfig<T, any>) => Record<string, Function>;
  initialize?: (manager: any) => void;
};

// Pre-built behavior compositions
export const createHistoryBehavior = <T>(config: BehaviorConfig['history']): BehaviorFunction<T> => ({
  extendState: (baseState) => ({
    ...baseState,
    changeHistory: [],
    currentHistoryIndex: -1,
  }),
  extendActions: (baseActions) => [
    ...baseActions,
    'UNDO',
    'REDO',
  ],
  createHandlers: (managerConfig) => ({
    UNDO: (state: any) => {
      // Undo logic extracted to reusable function
    },
    REDO: (state: any) => {
      // Redo logic extracted to reusable function
    },
  }),
  createMethods: () => ({
    canUndo: function(this: any) { return this.state.currentHistoryIndex >= 0; },
    canRedo: function(this: any) { return this.state.currentHistoryIndex < this.state.changeHistory.length - 1; },
    addToHistory: function(this: any) { /* history management */ },
  }),
});

export const createDrawingBehavior = <T>(config: BehaviorConfig['drawing']): BehaviorFunction<T> => ({
  extendState: (baseState) => ({
    ...baseState,
    currentDraw: null,
    isDrawing: false,
  }),
  extendActions: (baseActions) => [
    ...baseActions,
    'START_DRAW',
    'UPDATE_DRAW',
    'FINISH_DRAW',
    'CANCEL_DRAW',
  ],
  createHandlers: (managerConfig) => ({
    START_DRAW: (state: any, payload: any) => {
      state.currentDraw = payload;
      state.isDrawing = true;
    },
    UPDATE_DRAW: (state: any, payload: any) => {
      if (state.isDrawing) {
        state.currentDraw = payload;
      }
    },
    FINISH_DRAW: (state: any) => {
      if (state.currentDraw && state.isDrawing) {
        const newItem = {
          ...state.currentDraw,
          id: generateId(managerConfig.domain.domain),
        };
        state[managerConfig.state.coreCollections.new].push(newItem);
      }
      state.currentDraw = null;
      state.isDrawing = false;
    },
    CANCEL_DRAW: (state: any) => {
      state.currentDraw = null;
      state.isDrawing = false;
    },
  }),
});

export const createSelectionTrackingBehavior = <T>(config: BehaviorConfig['selection']): BehaviorFunction<T> => ({
  extendState: (baseState) => ({
    ...baseState,
    selectedItemId: null,
  }),
  extendActions: (baseActions) => [
    ...baseActions,
    'SELECT_ITEM',
    'CLEAR_SELECTION',
  ],
  createHandlers: () => ({
    SELECT_ITEM: (state: any, payload: string | null) => {
      state.selectedItemId = payload;
    },
    CLEAR_SELECTION: (state: any) => {
      state.selectedItemId = null;
    },
  }),
  createMethods: (managerConfig) => ({
    getSelectedItem: function(this: any) {
      if (!this.state.selectedItemId) return null;
      return this.getAllItems().find((item: any) => 
        managerConfig.comparator.getId(item) === this.state.selectedItemId
      );
    },
  }),
});

// Utility functions for configuration generation
export const generateId = (domain: string): string => {
  return `${domain}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createStandardActions = (domain: string): ActionConfig => ({
  standard: {
    loading: ['SET_LOADING', 'SET_SAVING'],
    crud: [
      `LOAD_SAVED_${domain.toUpperCase()}S`,
      `ADD_NEW_${domain.toUpperCase()}`,
      `UPDATE_${domain.toUpperCase()}`,
      `DELETE_${domain.toUpperCase()}`,
    ],
    bulk: ['CLEAR_ALL', 'COMMIT_CHANGES', 'DISCARD_ALL_CHANGES'],
  },
});

export const createStandardState = (domain: string): StateConfig<any> => ({
  coreCollections: {
    saved: `saved${capitalize(domain)}s`,
    new: `new${capitalize(domain)}s`,
  },
  loadingStates: ['isLoading', 'isSaving'],
  errorStates: ['error'],
  contextFields: ['documentId'],
});

const capitalize = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);

// Manager factory function
export const createDomainManager = <T, CreateT>(config: ManagerConfig<T, CreateT>) => {
  // Dynamic class generation based on configuration
  return class ConfigurableManager {
    private state: any;
    private listeners: Set<(state: any) => void> = new Set();
    private actionHandlers: Record<string, Function> = {};
    private customMethods: Record<string, Function> = {};

    constructor(documentId: string, initialState?: any) {
      // Build state from configuration
      this.state = this.buildInitialState(documentId, initialState, config);
      
      // Build action handlers from configuration + behaviors
      this.actionHandlers = this.buildActionHandlers(config);
      
      // Build custom methods from behaviors
      this.customMethods = this.buildCustomMethods(config);
      
      // Bind custom methods to instance
      Object.keys(this.customMethods).forEach(methodName => {
        (this as any)[methodName] = this.customMethods[methodName].bind(this);
      });
    }

    private buildInitialState(documentId: string, initialState: any, config: ManagerConfig<T, CreateT>) {
      let state = {
        [config.state.coreCollections.saved]: [],
        [config.state.coreCollections.new]: [],
        documentId,
        initialState: {
          [config.state.coreCollections.saved]: [],
          [config.state.coreCollections.new]: [],
          timestamp: Date.now(),
        },
        ...initialState,
      };

      // Add standard loading/error states
      config.state.loadingStates.forEach(loadingState => {
        state[loadingState] = false;
      });
      config.state.errorStates.forEach(errorState => {
        state[errorState] = null;
      });

      // Apply behavior extensions
      Object.values(config.behaviors).forEach(behaviorConfig => {
        if (behaviorConfig?.enabled) {
          const behavior = this.getBehaviorFunction(behaviorConfig);
          if (behavior.extendState) {
            state = behavior.extendState(state);
          }
        }
      });

      return state;
    }

    private buildActionHandlers(config: ManagerConfig<T, CreateT>) {
      const handlers: Record<string, Function> = {};

      // Add standard CRUD handlers
      // ... implementation would generate handlers based on config

      // Add behavior-specific handlers
      Object.entries(config.behaviors).forEach(([behaviorName, behaviorConfig]) => {
        if (behaviorConfig?.enabled) {
          const behavior = this.getBehaviorFunction(behaviorConfig);
          if (behavior.createHandlers) {
            Object.assign(handlers, behavior.createHandlers(config));
          }
        }
      });

      return handlers;
    }

    private buildCustomMethods(config: ManagerConfig<T, CreateT>) {
      let methods: Record<string, Function> = {};

      // Add behavior-specific methods
      Object.entries(config.behaviors).forEach(([behaviorName, behaviorConfig]) => {
        if (behaviorConfig?.enabled) {
          const behavior = this.getBehaviorFunction(behaviorConfig);
          if (behavior.createMethods) {
            Object.assign(methods, behavior.createMethods(config));
          }
        }
      });

      return methods;
    }

    private getBehaviorFunction(behaviorConfig: any): BehaviorFunction<T> {
      // Map behavior configs to their implementations
      // This would be a registry of available behaviors
      return {} as BehaviorFunction<T>;
    }

    // Core manager interface
    getState() { return { ...this.state }; }
    subscribe(listener: (state: any) => void) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    dispatch(action: any) {
      const handler = this.actionHandlers[action.type];
      if (handler) {
        handler(this.state, action.payload);
        this.notify();
      }
    }
    private notify() {
      this.listeners.forEach(listener => listener(this.getState()));
    }
  };
}
