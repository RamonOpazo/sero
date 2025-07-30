import { z } from 'zod';

// Enums - matching backend exactly
export const ProjectStatusEnumSchema = z.enum(['awaiting', 'in_progress', 'completed']);
export const DocumentStatusEnumSchema = z.enum(['pending', 'processed', 'failed']);
export const PromptLanguageEnumSchema = z.enum(['catalonian', 'castillian', 'english']);
export const FileTypeEnumSchema = z.enum(['original', 'redacted']);

// Types
export type ProjectStatusEnum = z.infer<typeof ProjectStatusEnumSchema>;
export type DocumentStatusEnum = z.infer<typeof DocumentStatusEnumSchema>;
export type PromptLanguageEnum = z.infer<typeof PromptLanguageEnumSchema>;
export type FileTypeEnum = z.infer<typeof FileTypeEnumSchema>;
