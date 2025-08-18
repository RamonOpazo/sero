/**
 * Hooks for fetching document-specific data on-demand
 * Used by document-viewer components for prompts and selections
 */

import { useState, useEffect, useCallback } from 'react';
import { EditorAPI } from '@/lib/editor-api';
import type { PromptType, SelectionType } from '@/types';

export function useDocumentPrompts(documentId: string) {
  const [prompts, setPrompts] = useState<PromptType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) {
      setPrompts([]);
      setLoading(false);
      return;
    }

    const fetchPrompts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await EditorAPI.fetchDocumentPrompts(documentId);
        
        if (result.ok) {
          setPrompts(result.value);
        } else {
          console.error('Failed to fetch prompts:', result.error);
          setError('Failed to load prompts');
          setPrompts([]);
        }
      } catch (err) {
        console.error('Error fetching prompts:', err);
        setError('Failed to load prompts');
        setPrompts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPrompts();
  }, [documentId]);

  return { prompts, loading, error };
}

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
