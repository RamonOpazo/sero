/**
 * Selection Manager Factory
 * 
 * Creates selection manager instances using the V2 domain manager with declarative configuration.
 * Provides a clean factory interface for creating selection managers.
 */

import { createDomainManager } from '@/lib/domain-manager';
import { selectionDomainConfig, type SelectionDomainManager, type Selection } from './selection-config';

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a new selection manager instance for a document
 * 
 * @param documentId - The document ID to associate selections with
 * @param initialSelections - Optional initial selections to load
 * @returns A fully configured selection domain manager
 */
export function createSelectionManager(
  documentId: string,
  initialSelections?: {
    saved?: Selection[];
    new?: Selection[];
  }
): SelectionDomainManager {
  // Create the domain manager instance with our declarative config
  const manager = createDomainManager(selectionDomainConfig, documentId);
  
  // Initialize with provided selections if any
  if (initialSelections?.saved?.length) {
    manager.dispatch({ type: 'LOAD_ITEMS', payload: initialSelections.saved });
  }
  
  if (initialSelections?.new?.length) {
    initialSelections.new.forEach(selection => {
      manager.dispatch({ type: 'CREATE_ITEM', payload: selection });
    });
  }
  
  return manager;
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type { SelectionDomainManager, Selection } from './selection-config';
export type { SelectionCreateType } from '@/types';
