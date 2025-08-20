/**
 * Prompt Domain Configuration
 *
 * Declarative configuration for prompt management using V2 domain manager.
 */

import type { DomainManagerConfig, ApiAdapter, DataTransforms as ApiTransforms, ItemComparators as Comparators } from '@/lib/domain-manager';
import { DocumentViewerAPI } from '@/lib/document-viewer-api';
import type { PromptType, PromptCreateType } from '@/types';

// =============================================================================
// API ADAPTER
// =============================================================================

const promptApiAdapter: ApiAdapter<PromptType, Omit<PromptCreateType, 'document_id'>> = {
  fetch: async (contextId: string) => {
    const result = await DocumentViewerAPI.fetchDocumentPrompts(contextId);
    return result as any;
  },
  create: async (contextId: string, data: Omit<PromptCreateType, 'document_id'>) => {
    const result = await DocumentViewerAPI.createPrompt(contextId, data);
    return result as any;
  },
  update: async (id: string, data: Partial<PromptType>) => {
    const updates: Partial<Pick<PromptType, 'text'|'temperature'|'languages'>> = {
      text: data.text,
      temperature: data.temperature,
      languages: data.languages,
    };
    const result = await DocumentViewerAPI.updatePrompt(id, updates);
    if (result.ok) {
      return { ok: true, value: { ...(data as PromptType), id } } as any;
    }
    return result as any;
  },
  delete: DocumentViewerAPI.deletePrompt
};

// =============================================================================
// TRANSFORMS
// =============================================================================

const promptTransforms: ApiTransforms<PromptType, Omit<PromptCreateType, 'document_id'>> = {
  forCreate: (prompt: PromptType): Omit<PromptCreateType, 'document_id'> => ({
    text: prompt.text,
    temperature: prompt.temperature,
    languages: prompt.languages,
  }),
  forUpdate: (prompt: PromptType): Partial<PromptType> => ({
    text: prompt.text,
    temperature: prompt.temperature,
    languages: prompt.languages,
  }),
  // Prompts come from API already shaped as PromptType, passthrough
  fromApi: (apiItem: unknown): PromptType => apiItem as PromptType,
};

// =============================================================================
// COMPARATORS
// =============================================================================

const promptComparators: Comparators<PromptType> = {
  getId: (p: PromptType) => p.id,
  areEqual: (a: PromptType, b: PromptType) => (
    a.text === b.text && a.temperature === b.temperature && JSON.stringify(a.languages) === JSON.stringify(b.languages)
  ),
};

// =============================================================================
// CONFIGURATION
// =============================================================================

export const promptDomainConfig: DomainManagerConfig<PromptType, Omit<PromptCreateType, 'document_id'>> = {
  domain: 'document-viewer',
  entityName: 'prompt',
  api: promptApiAdapter,
  transforms: promptTransforms,
  comparators: promptComparators,
  behaviors: [
    'crud',
    'changeTracking',
    'history',
    'historyIntegration',
    'bulkOperations',
  ],
  extensions: {
    state: {},
    actions: {},
    methods: {},
  }
};

export type PromptDomainManager = ReturnType<typeof import('@/lib/domain-manager').createDomainManager<PromptType, Omit<PromptCreateType,'document_id'>>>;
export type { PromptType, PromptCreateType };

