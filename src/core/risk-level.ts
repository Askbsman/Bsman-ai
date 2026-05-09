import type { AnalyzeResponse } from "../schemas/analyze-response.js";

export type RiskLevel = AnalyzeResponse["risk_level"];

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}
