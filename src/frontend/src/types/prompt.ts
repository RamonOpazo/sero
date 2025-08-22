import { z } from 'zod';
import { UUIDSchema, ISO8601DateTimeSchema } from './base';

// Prompt schemas (aligned with backend)
export const PromptSchema = z.object({
  id: UUIDSchema,
  created_at: ISO8601DateTimeSchema,
  updated_at: ISO8601DateTimeSchema.nullable(),
  title: z.string(),
  prompt: z.string(),
  directive: z.string(),
  enabled: z.boolean(),
  document_id: UUIDSchema,
});

export const PromptCreateSchema = z.object({
  id: UUIDSchema.optional(),
  title: z.string(),
  prompt: z.string(),
  directive: z.string(),
  enabled: z.boolean().default(true),
  document_id: UUIDSchema,
});

export const PromptUpdateSchema = z.object({
  title: z.string().optional(),
  prompt: z.string().optional(),
  directive: z.string().optional(),
  enabled: z.boolean().optional(),
});

// Types
export type PromptType = z.infer<typeof PromptSchema>;
export type PromptCreateType = z.infer<typeof PromptCreateSchema>;
export type PromptUpdateType = z.infer<typeof PromptUpdateSchema>;
