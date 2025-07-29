import { z } from 'zod';
import { UUIDSchema, ISO8601DateTimeSchema } from './base';

// Selection schemas
export const SelectionSchema = z.object({
  id: UUIDSchema,
  created_at: ISO8601DateTimeSchema,
  updated_at: ISO8601DateTimeSchema.nullable(),
  page_number: z.number().int().nullable(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  confidence: z.number().nullable(),
  document_id: UUIDSchema,
  is_ai_generated: z.boolean(), // computed field
});

export const SelectionCreateSchema = z.object({
  id: UUIDSchema.optional(),
  page_number: z.number().int().nullable().optional(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1).nullable().optional(),
  document_id: UUIDSchema,
});

export const SelectionUpdateSchema = z.object({
  page_number: z.number().int().nullable().optional(),
  x: z.number().min(0).max(1).optional(),
  y: z.number().min(0).max(1).optional(),
  width: z.number().min(0).max(1).optional(),
  height: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
});

// Types
export type Selection = z.infer<typeof SelectionSchema>;
export type SelectionCreate = z.infer<typeof SelectionCreateSchema>;
export type SelectionUpdate = z.infer<typeof SelectionUpdateSchema>;
