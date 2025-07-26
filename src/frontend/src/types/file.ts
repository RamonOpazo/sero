import { z } from 'zod';
import { UUIDSchema, ISO8601DateTimeSchema } from './base';
import { FileTypeSchema } from './enums';

// File schemas
export const FileSchema = z.object({
  id: UUIDSchema,
  created_at: ISO8601DateTimeSchema,
  updated_at: ISO8601DateTimeSchema.nullable(),
  file_hash: z.string(),
  file_type: FileTypeSchema,
  file_size: z.number().int(),
  mime_type: z.string(),
  data: z.string(), // serialized as truncated string
  salt: z.string().nullable(), // base64 encoded or null
  document_id: UUIDSchema,
});

export const FileCreateSchema = z.object({
  file_hash: z.string().max(64),
  file_type: FileTypeSchema,
  mime_type: z.string().max(100),
  data: z.any(), // bytes
  salt: z.any().nullable(), // bytes or null
  document_id: UUIDSchema.nullable(),
});

export const FileUpdateSchema = z.object({
  file_hash: z.string().max(64).optional(),
  file_type: FileTypeSchema.optional(),
  mime_type: z.string().max(100).optional(),
  data: z.any().optional(), // bytes
  salt: z.any().nullable().optional(), // bytes or null
  document_id: UUIDSchema.nullable().optional(),
});

export const FileUploadSchema = z.object({
  project_id: UUIDSchema,
  file: z.any(), // UploadFile (browser File object)
  description: z.string().optional(),
});

// For frontend bulk upload (multiple files)
export const FileBulkUploadSchema = z.object({
  project_id: UUIDSchema,
  files: z.array(z.any()), // Multiple browser File objects
  password: z.string(),
  description_template: z.string().optional(),
});

// File download request
export const FileDownloadRequestSchema = z.object({
  file_id: UUIDSchema,
  password: z.string(),
  stream: z.boolean().optional().default(false),
});

// Types
export type File = z.infer<typeof FileSchema>;
export type FileCreate = z.infer<typeof FileCreateSchema>;
export type FileUpdate = z.infer<typeof FileUpdateSchema>;
export type FileUpload = z.infer<typeof FileUploadSchema>;
export type FileBulkUpload = z.infer<typeof FileBulkUploadSchema>;
export type FileDownloadRequest = z.infer<typeof FileDownloadRequestSchema>;
