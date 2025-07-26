import { z } from 'zod';

// API Client configuration schema
export const ApiClientConfigSchema = z.object({
  baseUrl: z.url(),
  timeout: z.number().positive().optional().default(30000),
  defaultHeaders: z.record(z.string(), z.string()).optional(),
});

export type ApiClientConfig = z.infer<typeof ApiClientConfigSchema>;

// Additional API Client types not covered by Zod schemas

// HTTP response wrapper
export interface ApiClientResponse<T = any> {
  data?: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

// HTTP methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Request options for API client
export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
}

// Additional types not covered by schemas
export interface ApiEndpointResponses {
  // For endpoints that return Blob data (file downloads)
  blob: Blob;
  // For endpoints that return binary data
  arrayBuffer: ArrayBuffer;
}
