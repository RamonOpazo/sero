/**
 * Integration hook to connect fetched selections from API with ViewerState
 * This bridges the gap between useDocumentSelections and the unified viewer state
 */

import { useEffect } from 'react';
import { useDocumentSelections } from '@/hooks/useDocumentData';
import { useUnifiedViewerContext } from '../core/ViewerState';

export function useSelectionsIntegration(documentId: string) {
  const { selections, loading, error } = useDocumentSelections(documentId);
  const { dispatch } = useUnifiedViewerContext();

  // Update ViewerState with fetched selections
  useEffect(() => {
    if (!loading && !error && selections.length > 0) {
      dispatch({ 
        type: 'SET_EXISTING_SELECTIONS', 
        payload: selections 
      });
    } else if (!loading && !error && selections.length === 0) {
      // Clear existing selections if no selections found
      dispatch({ 
        type: 'SET_EXISTING_SELECTIONS', 
        payload: [] 
      });
    }
  }, [selections, loading, error, dispatch]);

  return { 
    selectionsLoading: loading, 
    selectionsError: error,
    selectionsCount: selections.length 
  };
}
