import { z } from 'zod';
import { UUIDSchema, ISO8601DateTimeSchema } from './base';
import { ProjectStatusEnumSchema } from './enums';
import { DocumentSchema } from './document';
import { PaginationParamsSchema } from './api';

// Project schemas
export const ProjectSchema = z.object({
  id: UUIDSchema,
  created_at: ISO8601DateTimeSchema,
  updated_at: ISO8601DateTimeSchema.nullable(),
  name: z.string(),
  description: z.string().nullable(),
  contact_name: z.string(),
  contact_email: z.string(),
  password_hash: z.string(), // base64 encoded bytes
  documents: z.array(z.lazy(() => DocumentSchema)),
  document_count: z.number().int(), // computed field
  status: ProjectStatusEnumSchema, // computed field
});

export const ProjectShallowSchema = z.object({
  id: UUIDSchema,
  created_at: ISO8601DateTimeSchema,
  updated_at: ISO8601DateTimeSchema.nullable(),
  name: z.string(),
  description: z.string().nullable(),
  contact_name: z.string(),
  contact_email: z.string(),
  
  // Metadata about next level without loading full data
  document_count: z.number().int(),
  has_documents: z.boolean(),
  has_template: z.boolean(),
});

export const ProjectCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  contact_name: z.string().min(1).max(100),
  contact_email: z.string().min(1).max(100),
  password: z.string().min(8),
});

export const ProjectUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  contact_name: z.string().min(1).max(100).optional(),
  contact_email: z.string().min(1).max(100).optional(),
});

export const ProjectSummarySchema = z.object({
  project_id: UUIDSchema,
  name: z.string(),
  description: z.string().nullable(),
  contact_name: z.string(),
  contact_email: z.string(),
  created_at: ISO8601DateTimeSchema,
  updated_at: ISO8601DateTimeSchema.nullable(),
  status: ProjectStatusEnumSchema,
  
  // Document statistics
  document_count: z.number().int(),
  documents_with_original_files: z.number().int(),
  documents_with_redacted_files: z.number().int(),
  processed_documents_count: z.number().int(),
  
  // File statistics
  total_original_files_size: z.number().int(),
  total_redacted_files_size: z.number().int(),
  total_files_size: z.number().int(),
  
  // Processing components statistics
  total_prompts: z.number().int(),
  total_selections: z.number().int(),
  total_tags: z.number().int(),
  total_ai_selections: z.number().int(),
  total_manual_selections: z.number().int(),
  
  // Document processing timeline
  oldest_document_date: ISO8601DateTimeSchema.nullable(),
  newest_document_date: ISO8601DateTimeSchema.nullable(),
  
  // Top tags
  most_common_tags: z.array(z.tuple([z.string(), z.number().int()])),
});

// Search schemas
export const ProjectSearchParamsSchema = PaginationParamsSchema.extend({
  name: z.string().optional(),
  status: ProjectStatusEnumSchema.optional(),
  created_after: ISO8601DateTimeSchema.optional(),
  created_before: ISO8601DateTimeSchema.optional(),
});

// Types
export type ProjectType = z.infer<typeof ProjectSchema>;
export type ProjectShallowType = z.infer<typeof ProjectShallowSchema>;
export type ProjectCreateType = z.infer<typeof ProjectCreateSchema>;
export type ProjectUpdateType = z.infer<typeof ProjectUpdateSchema>;
export type ProjectSummaryType = z.infer<typeof ProjectSummarySchema>;
export type ProjectSearchParamsType = z.infer<typeof ProjectSearchParamsSchema>;
