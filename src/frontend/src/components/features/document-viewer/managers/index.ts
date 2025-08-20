// Document Viewer Managers
// Production-ready exports using the configuration-driven domain manager system

import { createDomainManager } from '@/lib/domain-manager';
import { promptManagerConfig } from './configs/prompt-manager-config';
import { selectionManagerConfig } from './configs/selection-manager-config';

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
 * Creates a new SelectionManager instance for a given document
 * 
 * @param documentId - The document ID to manage selections for  
 * @returns A fully configured selection manager with CRUD, history, drawing, and page operations
 */
export const createSelectionManager = (documentId: string) => {
  return createDomainManager(selectionManagerConfig, documentId);
};

// =============================================================================
// TYPE EXPORTS FOR CONSUMERS
// =============================================================================

// Re-export types for convenience
export type { PromptType, PromptCreateType } from '@/types';
export type { Selection } from './configs/selection-manager-config';
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
