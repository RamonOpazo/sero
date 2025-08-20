// Domain Manager - V2 Only
// Re-export V2 domain manager as the main API

export * from './v2';
export { createDomainManager } from './v2';

// Export types for convenience
export type {
  DomainManagerConfig,
  ApiAdapter,
  DataTransforms,
  ItemComparators,
  PendingChanges
} from './v2/state-types';
