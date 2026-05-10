import type { NormalizedAnalyzeRequest } from "../schemas/analyze-request.js";
import type {
  AgentActionVerdict,
  AnalyzeResponse
} from "../schemas/analyze-response.js";
import { riskLevelFromScore } from "./risk-level.js";
import { createSafeReply } from "./safe-reply.js";
import { scoreInput } from "./scoring.js";

export const disclaimer =
  "BS Man Risk API analyzes communication risk signals only. It is not legal advice, financial advice, a lie detector, or a guarantee that something is true or false.";

function inputTextFor(request: NormalizedAnalyzeRequest): string {
  const conversationText =
    request.conversation
      ?.map((message) => message.content)
      .join("\n") ?? "";
  return [request.input, conversationText].filter(Boolean).join("\n").trim();
}

function actionContextTextFor(request: NormalizedAnalyzeRequest): string {
  if (request.mode !== "agent_action_check") return "";

  return [
    request.proposed_action,
    request.asset,
    request.amount?.toString(),
    request.recipient_type,
    request.channel,
    request.verification_status,
    request.sensitive_data_involved === true ? "sensitive data involved" : ""
  ]
    .filter(Boolean)
    .join(" ");
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

function recommendedActionFor(request: NormalizedAnalyzeRequest, score: number): string {
  if (request.mode === "agent_action_check") {
    return "Use the verdict to decide whether the agent should proceed, pause, verify, require human review, or refuse.";
  }
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

function isUnverified(value: string | undefined): boolean {
  return value === undefined || /unverified|unknown|not_verified|pending/i.test(value);
}

function hasText(value: string | undefined, pattern: RegExp): boolean {
  return value !== undefined && pattern.test(value);
}

function agentActionRiskReasons(request: NormalizedAnalyzeRequest, score: number): string[] {
  const reasons: string[] = [];
  const action = request.proposed_action;

  if (score >= 75) {
    reasons.push("The surrounding communication contains critical risk signals.");
  } else if (score >= 50) {
    reasons.push("The surrounding communication contains high risk signals.");
  }

  if (action === "share_seed_phrase") {
    reasons.push("Sharing a seed phrase or recovery words is unsafe.");
  }
  if (
    action === "share_credentials" ||
    action === "share_sensitive_data" ||
    request.sensitive_data_involved === true
  ) {
    reasons.push("The proposed action involves credentials, personal data, or other sensitive information.");
  }
  if (action === "connect_wallet" || action === "sign_transaction") {
    reasons.push("The proposed action could grant wallet permissions or authorize a transaction.");
  }
  if (action === "send_payment" || action === "approve_transfer") {
    reasons.push("The proposed action moves money or approves a transfer.");
  }
  if (action === "click_link" || action === "download_file") {
    reasons.push("The proposed action opens an external link or file.");
  }
  if (action === "call_external_tool") {
    reasons.push("The proposed action calls an external tool or system.");
  }
  if (isUnverified(request.verification_status)) {
    reasons.push("The counterparty or request is not independently verified.");
  }
  if (hasText(request.recipient_type, /unknown|wallet|telegram|discord|support|marketplace/i)) {
    reasons.push("The recipient type increases impersonation, payment, or platform-bypass risk.");
  }
  if (hasText(request.channel, /telegram|discord|sms|whatsapp|marketplace_chat|email/i)) {
    reasons.push("The channel may be easy to impersonate or move off-platform.");
  }

  return [...new Set(reasons)];
}

function actionScoreAdjustment(request: NormalizedAnalyzeRequest): number {
  if (request.mode !== "agent_action_check") return 0;

  let adjustment = 0;
  const action = request.proposed_action;

  if (action === "share_seed_phrase") adjustment += 72;
  if (action === "share_credentials" || action === "share_sensitive_data") adjustment += 48;
  if (action === "connect_wallet" || action === "sign_transaction") adjustment += 44;
  if (action === "send_payment" || action === "approve_transfer") adjustment += 34;
  if (action === "click_link" || action === "download_file") adjustment += 26;
  if (action === "call_external_tool") adjustment += 8;

  if (request.sensitive_data_involved === true) adjustment += 16;
  if (isUnverified(request.verification_status)) adjustment += 18;
  if (hasText(request.recipient_type, /unknown|wallet|telegram|discord|support/i)) adjustment += 16;
  if (hasText(request.channel, /telegram|discord/i)) adjustment += 12;
  if (hasText(request.channel, /company_portal|official/i)) adjustment -= 18;
  if (hasText(request.recipient_type, /known_vendor|known_company/i)) adjustment -= 14;
  if (hasText(request.verification_status, /^verified$/i)) adjustment -= 18;
  if (request.sensitive_data_involved === false) adjustment -= 4;

  return adjustment;
}

function verdictFor(score: number, reasons: string[]): AgentActionVerdict {
  const reasonText = reasons.join(" ").toLowerCase();

  if (
    score >= 75 ||
    reasonText.includes("seed phrase") ||
    (reasonText.includes("wallet permissions") && reasonText.includes("not independently verified"))
  ) {
    return "do_not_proceed";
  }
  if (score >= 60) return "require_human_review";
  if (score >= 35) return "pause_and_verify";
  if (score >= 15) return "proceed_with_caution";
  return "proceed";
}

function nextBestActionFor(verdict: AgentActionVerdict): string {
  if (verdict === "do_not_proceed") {
    return "Do not perform the proposed action. Stop and require independent verification or human escalation.";
  }
  if (verdict === "require_human_review") {
    return "Escalate to a human reviewer before taking any action.";
  }
  if (verdict === "pause_and_verify") {
    return "Pause and verify the counterparty, destination, and request through an official channel.";
  }
  if (verdict === "proceed_with_caution") {
    return "Proceed only after confirming the details match a trusted, expected workflow.";
  }
  return "Proceed with the normal workflow.";
}

export function analyze(request: NormalizedAnalyzeRequest): AnalyzeResponse {
  const inputText = [inputTextFor(request), actionContextTextFor(request)]
    .filter(Boolean)
    .join("\n")
    .trim();
  const evidenceText = inputTextFor(request);
  const result = scoreInput(request.mode, inputText, evidenceText || inputText);
  const adjustedScore = Math.max(
    0,
    Math.min(100, Math.round(result.score + actionScoreAdjustment(request)))
  );
  const riskLevel = riskLevelFromScore(adjustedScore);
  const actionRiskReasons = agentActionRiskReasons(request, adjustedScore);
  const verdict =
    request.mode === "agent_action_check"
      ? verdictFor(adjustedScore, actionRiskReasons)
      : undefined;

  const response: AnalyzeResponse = {
    mode: request.mode,
    risk_score: adjustedScore,
    risk_level: riskLevel,
    summary: summaryFor(adjustedScore, result.detectedPatterns.length),
    detected_patterns: result.detectedPatterns,
    red_flags: result.redFlags,
    recommended_action: recommendedActionFor(request, adjustedScore),
    safe_reply: createSafeReply(request.mode, riskLevel, request.options?.tone),
    disclaimer
  };

  if (request.mode === "agent_action_check" && verdict !== undefined) {
    response.verdict = verdict;
    response.requires_human_review =
      verdict === "require_human_review" || verdict === "do_not_proceed";
    response.next_best_action = nextBestActionFor(verdict);
    response.action_risk_reasons =
      actionRiskReasons.length > 0
        ? actionRiskReasons
        : ["No major action-specific risk reason was detected."];
  }

  return response;
}
