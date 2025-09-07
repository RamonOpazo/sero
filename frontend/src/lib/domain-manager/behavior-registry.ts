// Domain Manager V2 - Behavior Registry
// Central registry for all available behaviors

import { BehaviorName, type Behavior } from './state-types';
import { crudBehavior } from './crud-behavior';
import { changeTrackingBehavior } from './change-tracking-behavior';
import { historyBehavior } from './history-behavior';
import { historyIntegrationBehavior } from './history-integration-behavior';
import { focusManagementBehavior } from './focus-management-behavior';
import { batchOperationsBehavior } from './batch-operations-behavior';
import { bulkOperationsBehavior } from './bulk-operations-behavior';

// =============================================================================
// BEHAVIOR REGISTRY
// =============================================================================

export const BEHAVIOR_REGISTRY: Record<BehaviorName, Behavior<any>> = {
  [BehaviorName.CRUD]: crudBehavior,
  [BehaviorName.CHANGE_TRACKING]: changeTrackingBehavior,
  [BehaviorName.HISTORY]: historyBehavior,
  [BehaviorName.HISTORY_INTEGRATION]: historyIntegrationBehavior,
  [BehaviorName.FOCUS_MANAGEMENT]: focusManagementBehavior,
  [BehaviorName.BATCH_OPERATIONS]: batchOperationsBehavior,
  [BehaviorName.BULK_OPERATIONS]: bulkOperationsBehavior,
  
  // TODO: Implement these behaviors as needed
  [BehaviorName.DRAFT_MANAGEMENT]: null as any, // Will be implemented later
  [BehaviorName.CONTEXT_OPERATIONS]: null as any, // Will be implemented later
};

// =============================================================================
// BEHAVIOR UTILITIES
// =============================================================================

/**
 * Get a behavior by name with type safety
 */
export function getBehavior(name: BehaviorName): Behavior<any> | null {
  return BEHAVIOR_REGISTRY[name] || null;
}

/**
 * Get multiple behaviors by names
 */
export function getBehaviors(names: ReadonlyArray<BehaviorName>): ReadonlyArray<Behavior<any>> {
  return names.map(name => getBehavior(name)).filter(Boolean) as ReadonlyArray<Behavior<any>>;
}

/**
 * Validate behavior dependencies
 */
export function validateBehaviorDependencies(behaviorNames: ReadonlyArray<BehaviorName>): {
  readonly isValid: boolean;
  readonly missingDependencies: ReadonlyArray<string>;
} {
  const availableBehaviors = new Set(behaviorNames);
  const missingDependencies: string[] = [];
  
  for (const name of behaviorNames) {
    const behavior = getBehavior(name);
    if (behavior && behavior.dependencies) {
      for (const dependency of behavior.dependencies) {
        if (!availableBehaviors.has(dependency)) {
          missingDependencies.push(`${name} requires ${dependency}`);
        }
      }
    }
  }
  
  return {
    isValid: missingDependencies.length === 0,
    missingDependencies
  };
}

/**
 * Sort behaviors by priority (lower numbers execute first)
 */
export function sortBehaviorsByPriority(behaviors: ReadonlyArray<Behavior<any>>): ReadonlyArray<Behavior<any>> {
  return [...behaviors].sort((a, b) => a.priority - b.priority);
}

/**
 * Get all available behavior names
 */
export function getAvailableBehaviorNames(): ReadonlyArray<BehaviorName> {
  return Object.values(BehaviorName);
}

/**
 * Check if a behavior is available
 */
export function isBehaviorAvailable(name: BehaviorName): boolean {
  const behavior = getBehavior(name);
  return behavior !== null && behavior !== undefined;
}
