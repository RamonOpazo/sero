import { z } from 'zod';

// Enums - matching backend exactly
export const ProjectStatusSchema = z.enum(['awaiting', 'in_progress', 'completed']);
export const DocumentStatusSchema = z.enum(['pending', 'processed', 'failed']);
export const PromptLanguageSchema = z.enum(['catalonian', 'castillian', 'english']);
export const FileTypeSchema = z.enum(['original', 'redacted']);

// Types
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;
export type PromptLanguage = z.infer<typeof PromptLanguageSchema>;
export type FileType = z.infer<typeof FileTypeSchema>;
