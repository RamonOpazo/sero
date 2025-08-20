// Document Viewer Managers
// Production-ready exports using the configuration-driven domain manager system

import { createDomainManager } from '@/lib/domain-manager';
import { promptManagerConfig } from './configs/prompt-manager-config';
import { createSelectionManager as createV2SelectionManager } from '../core/selection-manager';

// =============================================================================
// MANAGER FACTORY FUNCTIONS
// =============================================================================

/**
 * Creates a new PromptManager instance for a given document
 * 
 * @param documentId - The document ID to manage prompts for
 * @returns A fully configured prompt manager with all CRUD and bulk operations
 */
export const createPromptManager = (documentId: string) => {
  return createDomainManager(promptManagerConfig, documentId);
};

/**
 * Creates a new SelectionManager instance for a given document using V2 system
 * 
 * @param documentId - The document ID to manage selections for  
 * @returns A fully configured V2 selection manager with CRUD, history, drawing, and page operations
 */
export const createSelectionManager = (documentId: string) => {
  return createV2SelectionManager(documentId);
};

// =============================================================================
// TYPE EXPORTS FOR CONSUMERS
// =============================================================================

// Re-export types for convenience
export type { PromptType, PromptCreateType } from '@/types';
export type { Selection } from '../core/selection-config';
export type { SelectionType, SelectionCreateType } from '@/types';

// Manager instance types for React components
export type PromptManagerInstance = ReturnType<typeof createPromptManager>;
export type SelectionManagerInstance = ReturnType<typeof createSelectionManager>;

// =============================================================================
// LEGACY COMPATIBILITY (if needed for gradual migration)
// =============================================================================

/**
 * @deprecated Use createPromptManager instead
 * Legacy export for backward compatibility during migration
 */
export const PromptManager = {
  create: createPromptManager
};

/**
 * @deprecated Use createSelectionManager instead  
 * Legacy export for backward compatibility during migration
 */
export const SelectionManager = {
  create: createSelectionManager
};
