import { z } from "zod";
import { analyzeModes } from "./analyze-request.js";

export const riskLevels = ["low", "medium", "high", "critical"] as const;

export const detectedPatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  weight: z.number().int().min(0).max(100),
  matched_phrases: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  evidence_snippet: z.string().max(160)
});

export const analyzeResponseSchema = z.object({
  mode: z.enum(analyzeModes),
  risk_score: z.number().int().min(0).max(100),
  risk_level: z.enum(riskLevels),
  summary: z.string(),
  detected_patterns: z.array(detectedPatternSchema),
  red_flags: z.array(z.string()),
  recommended_action: z.string(),
  safe_reply: z.string().nullable(),
  disclaimer: z.string()
});

export type DetectedPattern = z.infer<typeof detectedPatternSchema>;
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
