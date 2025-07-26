import { z } from 'zod';

// Base schemas
export const UUIDSchema = z.uuidv4();
export const ISO8601DateTimeSchema = z.iso.datetime({ offset: true });

// Types
export type UUID = z.infer<typeof UUIDSchema>;
export type ISO8601DateTime = z.infer<typeof ISO8601DateTimeSchema>;
