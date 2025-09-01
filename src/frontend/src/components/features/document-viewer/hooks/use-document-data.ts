/**
 * Hooks for fetching document-specific data on-demand
 * Used by document-viewer components for prompts and selections
 */

import { useState, useEffect, useCallback } from 'react';
import { EditorAPI } from '@/lib/editor-api';
import type { SelectionType } from '@/types';


export function useDocumentSelections(documentId: string) {
  const [selections, setSelections] = useState<SelectionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSelections = useCallback(async () => {
    if (!documentId) {
      setSelections([]);
      setLoading(false);
      return [];
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await EditorAPI.fetchDocumentSelections(documentId);
      
      if (result.ok) {
        setSelections(result.value);
        return result.value;
      } else {
        console.error('Failed to fetch selections:', result.error);
        setError('Failed to load selections');
        setSelections([]);
        return [];
      }
    } catch (err) {
      console.error('Error fetching selections:', err);
      setError('Failed to load selections');
      setSelections([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchSelections();
  }, [fetchSelections]);

  return { selections, loading, error, refetch: fetchSelections };
}
