// PromptManager Configuration for Domain Manager Library
import type { PromptType, PromptCreateType } from '@/types';
import { DocumentViewerAPI } from '@/lib/document-viewer-api';
import type { 
  DomainManagerConfig, 
  ApiAdapter,
  ApiTransforms
} from '@/lib/domain-manager';
import { createStandardComparators } from '@/lib/domain-manager';

// =============================================================================
// API ADAPTER
// =============================================================================

const promptApiAdapter: ApiAdapter<PromptType, PromptCreateType> = {
  fetch: DocumentViewerAPI.fetchDocumentPrompts,
  create: DocumentViewerAPI.createPrompt,
  update: DocumentViewerAPI.updatePrompt,
  delete: DocumentViewerAPI.deletePrompt
};

// =============================================================================
// TRANSFORMS
// =============================================================================

const promptTransforms: ApiTransforms<PromptType, PromptCreateType> = {
  forCreate: (prompt: PromptType): PromptCreateType => ({
    text: prompt.text,
    temperature: prompt.temperature,
    languages: prompt.languages,
    document_id: '' // Will be set by API layer
  }),
  
  forUpdate: (prompt: PromptType): Partial<Pick<PromptType, 'text' | 'temperature' | 'languages'>> => ({
    text: prompt.text,
    temperature: prompt.temperature,
    languages: prompt.languages
  })
  
  // No fromApi transform needed - API returns PromptType directly
};

// =============================================================================
// CUSTOM STATE EXTENSIONS
// =============================================================================

const promptStateExtensions = {
  // Additional loading states specific to prompts
  isDeleting: null as string | null, // ID of prompt being deleted
};

// =============================================================================
// CUSTOM ACTION HANDLERS
// =============================================================================

const promptActionHandlers = {
  SET_DELETING: (state: any, payload: string | null) => {
    state.isDeleting = payload;
  }
};

// =============================================================================
// CUSTOM METHOD EXTENSIONS
// =============================================================================

const promptMethodExtensions = {
  // Additional methods specific to prompts
  getPromptById: (state: any, id: string): PromptType | undefined => {
    return state.savedItems.find((p: PromptType) => p.id === id) ||
           state.newItems.find((p: PromptType) => p.id === id);
  },
  
  hasPrompts: (state: any): boolean => {
    return state.savedItems.length > 0 || state.newItems.length > 0;
  },
  
  getPromptCount: (state: any): number => {
    return state.savedItems.length + state.newItems.length;
  }
};

// =============================================================================
// CONFIGURATION OBJECT
// =============================================================================

export const promptManagerConfig: DomainManagerConfig<PromptType, PromptCreateType> = {
  // Domain identification
  domain: 'document-viewer',
  entityName: 'prompt',
  
  // API integration
  api: promptApiAdapter,
  transforms: promptTransforms,
  comparators: createStandardComparators<PromptType>(),
  
  // Behavior composition - matching original PromptManager functionality
  behaviors: [
    'crud',          // Core CRUD operations
    'changeTracking', // Pending changes tracking
    'bulkOperations' // Clear all functionality
  ],
  
  // Domain-specific extensions
  extensions: {
    state: promptStateExtensions,
    actions: promptActionHandlers,
    methods: promptMethodExtensions
  }
};

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type PromptManagerInstance = ReturnType<typeof import('@/lib/domain-manager').createDomainManager<PromptType, PromptCreateType>>;

// Re-export for convenience
export type { PromptType, PromptCreateType } from '@/types';
