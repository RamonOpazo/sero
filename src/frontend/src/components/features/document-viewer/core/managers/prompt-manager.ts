/**
 * Prompt Manager Factory using V2 domain manager
 */

import { createDomainManager } from '@/lib/domain-manager';
import { promptDomainConfig, type PromptDomainManager } from '../configs/prompts-config';
import type { PromptType } from '@/types';

export function createPromptManager(documentId: string, initialPrompts?: PromptType[]): PromptDomainManager {
  const manager = createDomainManager(promptDomainConfig, documentId);

  if (initialPrompts && initialPrompts.length) {
    manager.dispatch('LOAD_ITEMS' as any, initialPrompts);
    manager.dispatch('CAPTURE_BASELINE' as any, undefined as any);
  }

  return manager;
}

export type { PromptType };
