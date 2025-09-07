import { z } from 'zod'

// Normalized bounding box in [0,1] coordinates
export const AiBoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
})

// Single detection item produced by the model
export const AiDetectionSchema = z.object({
  page: z.number().int().min(0),
  text: z.string().min(1),
  category: z.string().min(1),
  confidence: z.number().min(0).max(1),
  boxes: z.array(AiBoxSchema).optional(),
  context: z.string().optional(),
})

// Full response from the model
export const AiDetectionsSchema = z.array(AiDetectionSchema)

export type AiBox = z.infer<typeof AiBoxSchema>
export type AiDetection = z.infer<typeof AiDetectionSchema>

export function parseAiDetections(input: unknown): AiDetection[] {
  const result = AiDetectionsSchema.safeParse(input)
  if (!result.success) {
    throw new Error(`Invalid AI detections: ${result.error.message}`)
  }
  return result.data
}

