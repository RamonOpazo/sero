/*
 * Hook to load selections from API directly into the new SelectionManager system
 * This replaces useSelectionsIntegration and maintains proper separation of concerns
 *
 * @deprecated This hook will be folded into SelectionProvider (initial load on mount).
 *             Prefer relying on SelectionProvider with documentId to perform initial load.
 */

import { useEffect } from 'react';
import { useDocumentSelections } from './use-document-data';
import { useSelections } from '../providers/selection-provider';

export function useSelectionLoader(documentId: string) {
  const { selections, loading, error } = useDocumentSelections(documentId);
  const { loadSavedSelections } = useSelections();

  // Load selections from API directly into new SelectionManager system
  useEffect(() => {
    if (!loading && !error) {
      // Convert API selections to new system format and load them
      const savedSelections = selections.map(sel => ({
        ...sel,
        id: sel.id || `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
      
      loadSavedSelections(savedSelections);
    }
  }, [selections, loading, error, loadSavedSelections]);

  return { 
    selectionsLoading: loading, 
    selectionsError: error,
    selectionsCount: selections.length 
  };
}
