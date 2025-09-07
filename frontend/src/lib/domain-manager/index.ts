// Domain Manager V2 - Main API and Utilities
// Clean API for creating and configuring domain managers

import { CoreDomainManager } from './core-domain-manager';
import type {
  DomainManagerConfig,
  DomainManager,
  ApiAdapter,
  DataTransforms,
  ItemComparators,
  DomainOptions
} from './state-types';
import { BehaviorName } from './state-types';

// =============================================================================
// MAIN FACTORY FUNCTION
// =============================================================================

/**
 * Creates a new domain manager instance with the specified configuration.
 * 
 * @param config - Domain manager configuration specifying behaviors, API, and extensions
 * @param contextId - The context ID this manager will operate on (e.g., documentId)
 * @returns A fully configured domain manager instance
 * 
 * @example
 * ```typescript
 * import { createDomainManager, BehaviorName } from '@/lib/domain-manager/v2';
 * 
 * const itemManager = createDomainManager({
 *   domain: 'document-viewer',
 *   entityName: 'selection',
 *   api: selectionApiAdapter,
 *   transforms: selectionTransforms,
 *   comparators: createStandardComparators<Selection>(),
 *   behaviors: [
 *     BehaviorName.CRUD,
 *     BehaviorName.CHANGE_TRACKING,
 *     BehaviorName.HISTORY,
 *     BehaviorName.HISTORY_INTEGRATION,
 *     BehaviorName.FOCUS_MANAGEMENT
 *   ]
 * }, documentId);
 * ```
 */
export function createDomainManager<TItem, TCreateData = Omit<TItem, 'id'>>(
  config: DomainManagerConfig<TItem, TCreateData>,
  contextId: string
): DomainManager<TItem> {
  return new CoreDomainManager(config, contextId);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Creates a standard API adapter configuration for REST-like APIs
 */
export function createRestApiAdapter<TItem, TCreateData>(
  baseApi: {
    fetch: (contextId: string) => Promise<any>;
    create: (contextId: string, data: TCreateData) => Promise<any>;
    update: (id: string, data: Partial<TItem>) => Promise<any>;
    delete: (id: string) => Promise<any>;
  }
): ApiAdapter<TItem, TCreateData> {
  return {
    fetch: baseApi.fetch,
    create: baseApi.create,
    update: baseApi.update,
    delete: baseApi.delete
  };
}

/**
 * Creates standard comparators for objects with id property
 */
export function createStandardComparators<TItem extends { id: string }>(): ItemComparators<TItem> {
  return {
    getId: (item: TItem) => item.id,
    areEqual: (a: TItem, b: TItem) => JSON.stringify(a) === JSON.stringify(b)
  };
}

/**
 * Creates standard transforms that pass data through unchanged
 */
export function createPassThroughTransforms<TItem, TCreateData = Omit<TItem, 'id'>>(): DataTransforms<TItem, TCreateData> {
  return {
    forCreate: (item: TItem) => {
      const { id, ...rest } = item as any;
      return rest as TCreateData;
    },
    forUpdate: (item: TItem) => item as Partial<TItem>
  };
}

// =============================================================================
// CONFIGURATION HELPERS
// =============================================================================

/**
 * Creates a basic CRUD-only manager configuration
 */
export function createBasicConfig<TItem extends { id: string }, TCreateData = Omit<TItem, 'id'>>(
  domain: string,
  entityName: string,
  api: ApiAdapter<TItem, TCreateData>,
  options?: DomainOptions
): DomainManagerConfig<TItem, TCreateData> {
  return {
    domain,
    entityName,
    api,
    transforms: createPassThroughTransforms<TItem, TCreateData>(),
    comparators: createStandardComparators<TItem>(),
    behaviors: [BehaviorName.CRUD, BehaviorName.CHANGE_TRACKING],
    options
  };
}

/**
 * Creates a full-featured manager configuration with history and focus management
 */
export function createFullFeaturedConfig<TItem extends { id: string }, TCreateData = Omit<TItem, 'id'>>(
  domain: string,
  entityName: string,
  api: ApiAdapter<TItem, TCreateData>,
  options?: DomainOptions
): DomainManagerConfig<TItem, TCreateData> {
  return {
    domain,
    entityName,
    api,
    transforms: createPassThroughTransforms<TItem, TCreateData>(),
    comparators: createStandardComparators<TItem>(),
    behaviors: [
      BehaviorName.CRUD,
      BehaviorName.CHANGE_TRACKING,
      BehaviorName.HISTORY,
      BehaviorName.HISTORY_INTEGRATION,
      BehaviorName.FOCUS_MANAGEMENT
    ],
    options
  };
}

/**
 * Creates a manager configuration optimized for UI interactions with selections
 */
export function createSelectionManagerConfig<TItem extends { id: string }, TCreateData = Omit<TItem, 'id'>>(
  domain: string,
  api: ApiAdapter<TItem, TCreateData>,
  options?: DomainOptions
): DomainManagerConfig<TItem, TCreateData> {
  return {
    domain,
    entityName: 'item', // Generic term
    api,
    transforms: createPassThroughTransforms<TItem, TCreateData>(),
    comparators: createStandardComparators<TItem>(),
    behaviors: [
      BehaviorName.CRUD,
      BehaviorName.CHANGE_TRACKING,
      BehaviorName.HISTORY,
      BehaviorName.HISTORY_INTEGRATION,
      BehaviorName.FOCUS_MANAGEMENT
    ],
    options: {
      historyLimit: 50,
      autoSave: false,
      strictMode: false,
      debugMode: false,
      ...options
    }
  };
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

// Export types for configuration
export type {
  DomainManagerConfig,
  DomainManager,
  ApiAdapter,
  DataTransforms,
  ItemComparators,
  CoreDomainState,
  PendingChanges,
  ChangesSummary,
  ValidationResult,
  ReadOnlyState,
  DomainOptions,
  ErrorType,
  ApiError
} from './state-types';

// Export action types and enums
export {
  CrudActionType,
  HistoryActionType,
  FocusActionType,
  DraftActionType,
  ChangeTrackingActionType,
  BatchActionType,
  ContextActionType,
  ActionSource,
  ChangeType,
  DraftType
} from './action-types';

export type {
  ActionType,
  ActionContext,
  Dispatch,
  ActionPayloadMap,
  HistoryRecord,
  DraftMetadata,
  BatchMetadata,
  ContextFilter
} from './action-types';

// Export behavior system
export { BehaviorName } from './state-types';
export type { Behavior } from './state-types';

// Export behavior registry utilities
export {
  getBehavior,
  getBehaviors,
  validateBehaviorDependencies,
  sortBehaviorsByPriority,
  getAvailableBehaviorNames,
  isBehaviorAvailable
} from './behavior-registry';

// Export core implementation for advanced use cases
export { CoreDomainManager } from './core-domain-manager';

// =============================================================================
// VERSION INFO
// =============================================================================

export const VERSION = '2.0.0';
export const FEATURES = {
  STRICT_TYPE_SAFETY: true,
  ENUM_DRIVEN_ACTIONS: true,
  BEHAVIOR_COMPOSITION: true,
  IMMUTABLE_STATE: true,
  CHANGE_BASED_HISTORY: true,
  GENERIC_TERMINOLOGY: true,
  CRUD_CONVENTIONS: true
} as const;
