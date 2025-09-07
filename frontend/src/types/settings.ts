import { z } from 'zod';
import { UUIDSchema, ISO8601DateTimeSchema } from './base';

// Project-level AI settings (aligned with backend settings_schema.AiSettings)
export const ProjectAiSettingsSchema = z.object({
  id: UUIDSchema,
  created_at: ISO8601DateTimeSchema,
  updated_at: ISO8601DateTimeSchema.nullable(),
  provider: z.string(),
  model_name: z.string(),
  temperature: z.number(),
  top_p: z.number().nullable(),
  max_tokens: z.number().int().nullable(),
  num_ctx: z.number().int().nullable(),
  seed: z.number().int().nullable(),
  stop_tokens: z.array(z.string()),
  system_prompt: z.string().nullable(),
  project_id: UUIDSchema,
});

export const ProjectAiSettingsUpdateSchema = z.object({
  provider: z.string().nullable().optional(),
  model_name: z.string().nullable().optional(),
  temperature: z.number().min(0).max(1).nullable().optional(),
  top_p: z.number().min(0).max(1).nullable().optional(),
  max_tokens: z.number().int().min(1).nullable().optional(),
  num_ctx: z.number().int().min(1).nullable().optional(),
  seed: z.number().int().nullable().optional(),
  stop_tokens: z.array(z.string()).nullable().optional(),
  system_prompt: z.string().nullable().optional(),
});

export type ProjectAiSettingsType = z.infer<typeof ProjectAiSettingsSchema>;
export type ProjectAiSettingsUpdateType = z.infer<typeof ProjectAiSettingsUpdateSchema>;

