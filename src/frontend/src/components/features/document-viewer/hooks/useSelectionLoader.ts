/**
 * Hook to load selections from API directly into the new SelectionManager system
 * This replaces useSelectionsIntegration and maintains proper separation of concerns
 */

import { useEffect } from 'react';
import { useDocumentSelections } from '@/components/DocumentEditor/useDocumentData';
import { useSelections } from '../core/SelectionProvider';

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
