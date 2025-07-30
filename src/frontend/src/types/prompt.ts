import { z } from 'zod';
import { UUIDSchema, ISO8601DateTimeSchema } from './base';

// Prompt schemas
export const PromptSchema = z.object({
  id: UUIDSchema,
  created_at: ISO8601DateTimeSchema,
  updated_at: ISO8601DateTimeSchema.nullable(),
  text: z.string(),
  languages: z.array(z.string()),
  temperature: z.number(),
  document_id: UUIDSchema,
});

export const PromptCreateSchema = z.object({
  id: UUIDSchema.optional(),
  text: z.string(),
  languages: z.array(z.string()),
  temperature: z.number().min(0).max(1),
  document_id: UUIDSchema,
});

export const PromptUpdateSchema = z.object({
  text: z.string().optional(),
  languages: z.array(z.string()).optional(),
  temperature: z.number().min(0).max(1).optional(),
});

// Types
export type PromptType = z.infer<typeof PromptSchema>;
export type PromptCreateType = z.infer<typeof PromptCreateSchema>;
export type PromptUpdateType = z.infer<typeof PromptUpdateSchema>;
