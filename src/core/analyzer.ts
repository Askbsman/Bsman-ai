import type { AnalyzeRequest } from "../schemas/analyze-request.js";
import type { AnalyzeResponse } from "../schemas/analyze-response.js";
import { riskLevelFromScore } from "./risk-level.js";
import { createSafeReply } from "./safe-reply.js";
import { scoreInput } from "./scoring.js";

export const disclaimer =
  "BS Man Risk API analyzes communication risk signals only. It is not legal advice, financial advice, a lie detector, or a guarantee that something is true or false.";

function inputTextFor(request: AnalyzeRequest): string {
  const conversationText =
    request.conversation
      ?.map((message) => message.content)
      .join("\n") ?? "";
  return [request.input, conversationText].filter(Boolean).join("\n").trim();
}

function summaryFor(score: number, patternCount: number): string {
  if (score >= 75) {
    return `Critical communication risk detected across ${patternCount} pattern(s). Treat the message as unsafe until independently verified.`;
  }
  if (score >= 50) {
    return `High communication risk detected across ${patternCount} pattern(s). Slow down and verify before taking action.`;
  }
  if (score >= 25) {
    return `Some communication risk signals detected across ${patternCount} pattern(s). Review details carefully before responding.`;
  }
  return "Low communication risk detected from the available text.";
}

function recommendedActionFor(request: AnalyzeRequest, score: number): string {
  if (request.mode === "safe_reply") {
    return "Use the generated reply to set a boundary and request verification.";
  }
  if (request.mode === "scam_check") {
    return "Do not send money or credentials. Verify through an official channel before continuing.";
  }
  if (request.mode === "offer_check") {
    return "Request verifiable company details, written terms, and avoid upfront or off-platform payment.";
  }
  if (request.mode === "manipulation_check") {
    return "Slow the conversation down, set a boundary, and ask for verifiable details in writing.";
  }
  if (request.mode === "dialogue_check") {
    return "Pause the interaction and verify the counterparty independently before taking action.";
  }
  return score >= 25
    ? "Ask clarifying questions and verify before sharing anything sensitive."
    : "Continue normally while keeping standard caution around money, credentials, and personal data.";
}

export function analyze(request: AnalyzeRequest): AnalyzeResponse {
  const inputText = inputTextFor(request);
  const result = scoreInput(request.mode, inputText);
  const riskLevel = riskLevelFromScore(result.score);

  return {
    mode: request.mode,
    risk_score: result.score,
    risk_level: riskLevel,
    summary: summaryFor(result.score, result.detectedPatterns.length),
    detected_patterns: result.detectedPatterns,
    red_flags: result.redFlags,
    recommended_action: recommendedActionFor(request, result.score),
    safe_reply: createSafeReply(request.mode, riskLevel, request.options?.tone),
    disclaimer
  };
}
