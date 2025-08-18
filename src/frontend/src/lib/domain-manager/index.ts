// Domain Manager Library - Main API
import type { DomainManagerConfig, DomainManager } from './types';
import { CoreDomainManager } from './core';

// =============================================================================
// MAIN FACTORY FUNCTION
// =============================================================================

/**
 * Creates a new domain manager instance with the specified configuration.
 * 
 * @param config - Domain manager configuration specifying behaviors, API, and extensions
 * @param documentId - The document ID this manager will operate on
 * @returns A fully configured domain manager instance
 * 
 * @example
 * ```typescript
 * import { createDomainManager } from '@/lib/domain-manager';
 * import { promptManagerConfig } from './prompt-manager-config';
 * 
 * const promptManager = createDomainManager(promptManagerConfig, documentId);
 * ```
 */
export function createDomainManager<T, CreateT = Omit<T, 'id'>>(
  config: DomainManagerConfig<T, CreateT>,
  documentId: string
): DomainManager<T> {
  return new CoreDomainManager(config, documentId);
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

// Export types for configuration
export type {
  DomainManagerConfig,
  DomainManager,
  ApiAdapter,
  ApiTransforms,
  Comparators,
  BehaviorKey,
  Behavior,
  Action,
  ActionHandler,
  MethodHandler,
  CoreState,
  StateSnapshot,
  PendingChanges,
  ActionMatcher,
  PatternMatchDispatcher
} from './types';

// Export behaviors for custom configuration
export { BEHAVIORS } from './behaviors';

// Export core implementation for advanced use cases
export { CoreDomainManager } from './core';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Creates a standard API adapter configuration for REST-like APIs
 */
export function createRestApiAdapter<T, CreateT>(
  baseApi: {
    fetch: (documentId: string) => Promise<any>;
    create: (documentId: string, data: CreateT) => Promise<any>;
    update: (id: string, data: Partial<T>) => Promise<any>;
    delete: (id: string) => Promise<any>;
  }
): DomainManagerConfig<T, CreateT>['api'] {
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
export function createStandardComparators<T extends { id: string }>(): DomainManagerConfig<T>['comparators'] {
  return {
    getId: (item: T) => item.id,
    areEqual: (a: T, b: T) => JSON.stringify(a) === JSON.stringify(b)
  };
}

/**
 * Creates standard transforms that pass data through unchanged
 */
export function createPassThroughTransforms<T, CreateT = Omit<T, 'id'>>(): DomainManagerConfig<T, CreateT>['transforms'] {
  return {
    forCreate: (item: T) => {
      const { id, ...rest } = item as any;
      return rest as CreateT;
    },
    forUpdate: (item: T) => item as Partial<T>
  };
}

// =============================================================================
// CONFIGURATION HELPERS
// =============================================================================

/**
 * Creates a basic CRUD-only manager configuration
 */
export function createBasicConfig<T extends { id: string }, CreateT = Omit<T, 'id'>>(
  domain: string,
  entityName: string,
  api: DomainManagerConfig<T, CreateT>['api']
): DomainManagerConfig<T, CreateT> {
  return {
    domain,
    entityName,
    api,
    transforms: createPassThroughTransforms<T, CreateT>(),
    comparators: createStandardComparators<T>(),
    behaviors: ['crud', 'changeTracking']
  };
}

/**
 * Creates a full-featured manager configuration with all behaviors
 */
export function createFullFeaturedConfig<T extends { id: string }, CreateT = Omit<T, 'id'>>(
  domain: string,
  entityName: string,
  api: DomainManagerConfig<T, CreateT>['api']
): DomainManagerConfig<T, CreateT> {
  return {
    domain,
    entityName,
    api,
    transforms: createPassThroughTransforms<T, CreateT>(),
    comparators: createStandardComparators<T>(),
    behaviors: [
      'crud',
      'changeTracking',
      'history',
      'drawing',
      'selection',
      'batchOperations',
      'pageOperations',
      'bulkOperations'
    ]
  };
}
