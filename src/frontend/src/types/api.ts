import { z } from 'zod';

// Response schemas
export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const ErrorResponseSchema = z.object({
  detail: z.union([z.string(), z.record(z.string(), z.any())]),
  error: z.string().optional(),
});

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
});

// Pagination schemas
export const PaginationParamsSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  size: z.number().int().min(1).max(100).optional().default(20),
});

export const PaginatedResponseSchema = z.object({
  items: z.array(z.any()),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  size: z.number().int().min(1),
  pages: z.number().int().min(0),
});

// Types
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;
export type PaginatedResponse<T = any> = Omit<z.infer<typeof PaginatedResponseSchema>, 'items'> & {
  items: T[];
};
