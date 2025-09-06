import { z } from 'zod';
import { UUIDSchema, ISO8601DateTimeSchema } from './base';
import { ScopeTypeEnumSchema, CommitStateEnumSchema } from './enums';

// Prompt schemas (aligned with backend)
export const PromptSchema = z.object({
  id: UUIDSchema,
  created_at: ISO8601DateTimeSchema,
  updated_at: ISO8601DateTimeSchema.nullable(),
  scope: ScopeTypeEnumSchema,
  state: CommitStateEnumSchema,
  is_staged: z.boolean(),
  title: z.string(),
  prompt: z.string(),
  directive: z.string(),
  document_id: UUIDSchema,
});

export const PromptCreateSchema = z.object({
  id: UUIDSchema.optional(),
  scope: ScopeTypeEnumSchema.default('document'),
  state: CommitStateEnumSchema.default('staged_creation'),
  title: z.string(),
  prompt: z.string(),
  directive: z.string(),
  document_id: UUIDSchema,
});

export const PromptUpdateSchema = z.object({
  scope: ScopeTypeEnumSchema.optional(),
  state: CommitStateEnumSchema.optional(),
  title: z.string().optional(),
  prompt: z.string().optional(),
  directive: z.string().optional(),
});

// Types
export type PromptType = z.infer<typeof PromptSchema>;
export type PromptCreateType = z.infer<typeof PromptCreateSchema>;
export type PromptUpdateType = z.infer<typeof PromptUpdateSchema>;

// UI types
export type UIPrompt = PromptType & { isUnsaved: boolean };
