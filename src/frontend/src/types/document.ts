import { z } from 'zod';
import { UUIDSchema, ISO8601DateTimeSchema } from './base';
import { FileSchema, FileCreateSchema } from './file';
import { PromptSchema } from './prompt';
import { SelectionSchema } from './selection';
import { PaginationParamsSchema } from './api';

// Document schemas
export const DocumentSchema = z.object({
  id: UUIDSchema,
  created_at: ISO8601DateTimeSchema,
  updated_at: ISO8601DateTimeSchema.nullable(),
  name: z.string(),
  description: z.string().nullable(),
  project_id: UUIDSchema,
  tags: z.array(z.string()),
  files: z.array(z.lazy(() => FileSchema)),
  prompts: z.array(z.lazy(() => PromptSchema)),
  selections: z.array(z.lazy(() => SelectionSchema)),
  original_file: z.lazy(() => FileSchema).nullable(), // computed field
  redacted_file: z.lazy(() => FileSchema).nullable(), // computed field
});

export const DocumentShallowSchema = z.object({
  id: UUIDSchema,
  created_at: ISO8601DateTimeSchema,
  updated_at: ISO8601DateTimeSchema.nullable(),
  name: z.string(),
  description: z.string().nullable(),
  project_id: UUIDSchema,
  tags: z.array(z.string()),
  
  // Metadata about next level without loading full data
  file_count: z.number().int(),
  prompt_count: z.number().int(),
  selection_count: z.number().int(),
  has_original_file: z.boolean(),
  has_redacted_file: z.boolean(),
  is_processed: z.boolean(),
});

export const DocumentCreateSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  project_id: UUIDSchema,
  tags: z.array(z.string()).default([]),
});

export const DocumentUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

// Document Summary schema
export const DocumentSummarySchema = z.object({
  document_id: UUIDSchema,
  name: z.string(),
  description: z.string().nullable(),
  created_at: ISO8601DateTimeSchema,
  updated_at: ISO8601DateTimeSchema.nullable(),
  
  // Project information
  project_name: z.string(),
  project_id: UUIDSchema,
  
  // File information
  has_original_file: z.boolean(),
  has_redacted_file: z.boolean(),
  original_file_size: z.number().int().nullable(),
  redacted_file_size: z.number().int().nullable(),
  total_file_size: z.number().int(),
  
  // Processing components counts
  prompt_count: z.number().int(),
  selection_count: z.number().int(),
  tag_count: z.number().int(),
  tags: z.array(z.string()),
  
  // Processing status indicators
  is_processed: z.boolean(),
  ai_selections_count: z.number().int(),
  manual_selections_count: z.number().int(),
  
  // Prompt analysis
  prompt_languages: z.array(z.string()),
  average_temperature: z.number().nullable(),
});

// Document Bulk Upload schema (matches backend schema)
export const DocumentBulkUploadSchema = z.object({
  document_data: DocumentCreateSchema,
  file_data: FileCreateSchema,
});

// Document upload schemas (for frontend API calls)
export const DocumentUploadRequestSchema = z.object({
  project_id: z.string(), // UUID as string in frontend
  file: z.any(), // Browser File object
  description: z.string().optional(),
  password: z.string(),
});

export const DocumentBulkUploadRequestSchema = z.object({
  project_id: z.string(), // UUID as string in frontend
  files: z.any(), // Browser FileList object
  template_description: z.string().optional(),
  password: z.string(),
});

// Search schemas
export const DocumentSearchParamsSchema = PaginationParamsSchema.extend({
  project_id: UUIDSchema.optional(),
  description: z.string().optional(),
  created_after: ISO8601DateTimeSchema.optional(),
  created_before: ISO8601DateTimeSchema.optional(),
});

// Minimal Document schema - for viewers that don't need prompts/selections
export const MinimalDocumentSchema = z.object({
  id: UUIDSchema,
  created_at: ISO8601DateTimeSchema,
  updated_at: ISO8601DateTimeSchema.nullable(),
  name: z.string(),
  description: z.string().nullable(),
  project_id: UUIDSchema,
  tags: z.array(z.string()),
  files: z.array(z.lazy(() => FileSchema)),
  original_file: z.lazy(() => FileSchema).nullable(), // computed field
  redacted_file: z.lazy(() => FileSchema).nullable(), // computed field
});

// Types
export type DocumentType = z.infer<typeof DocumentSchema>;
export type MinimalDocumentType = z.infer<typeof MinimalDocumentSchema>;
export type DocumentShallowType = z.infer<typeof DocumentShallowSchema>;
export type DocumentCreateType = z.infer<typeof DocumentCreateSchema>;
export type DocumentUpdateType = z.infer<typeof DocumentUpdateSchema>;
export type DocumentSummaryType = z.infer<typeof DocumentSummarySchema>;
export type DocumentBulkUploadType = z.infer<typeof DocumentBulkUploadSchema>;
export type DocumentUploadRequestType = z.infer<typeof DocumentUploadRequestSchema>;
export type DocumentBulkUploadRequestType = z.infer<typeof DocumentBulkUploadRequestSchema>;
export type DocumentSearchParamsType = z.infer<typeof DocumentSearchParamsSchema>;
