import { z } from "zod";

export const ReviewPointSchema = z.object({
  file: z.string().min(1),
  line: z.number().int().gte(1).optional(),
  severity: z.enum(["info", "minor", "major", "critical"]),
  title: z.string().min(1),
  message: z.string().min(1),
  suggestion: z.string().optional()
});

export const ReviewResponseSchema = z.object({
  summary: z.string().optional(),
  points: z.array(ReviewPointSchema).default([])
});

export type ReviewPoint = z.infer<typeof ReviewPointSchema>;
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;
