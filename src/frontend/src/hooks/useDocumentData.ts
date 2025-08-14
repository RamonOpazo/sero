/**
 * Hooks for fetching document-specific data on-demand
 * This eliminates the need to include prompts/selections in DocumentType
 */

import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';
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
        
        const result = await api.safe.get(`/documents/id/${documentId}/prompts`);
        
        if (result.ok) {
          setPrompts(result.value as PromptType[]);
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

  useEffect(() => {
    if (!documentId) {
      setSelections([]);
      setLoading(false);
      return;
    }

    const fetchSelections = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await api.safe.get(`/documents/id/${documentId}/selections`);
        
        if (result.ok) {
          setSelections(result.value as SelectionType[]);
        } else {
          console.error('Failed to fetch selections:', result.error);
          setError('Failed to load selections');
          setSelections([]);
        }
      } catch (err) {
        console.error('Error fetching selections:', err);
        setError('Failed to load selections');
        setSelections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSelections();
  }, [documentId]);

  return { selections, loading, error };
}
