import type { AnalyzeMode, SafeReplyTone } from "../schemas/analyze-request.js";
import type { RiskLevel } from "./risk-level.js";

export function createSafeReply(
  mode: AnalyzeMode,
  riskLevel: RiskLevel,
  tone: SafeReplyTone = "calm_firm"
): string | null {
  if (mode !== "safe_reply") return null;

  const replies: Record<SafeReplyTone, string> = {
    calm_firm:
      "I am not comfortable moving forward right now. Please send official details I can verify independently. I will not send money, codes, documents, or personal details until then.",
    polite:
      "Thanks for understanding. I need to verify this through an official channel before doing anything. Please send written details I can check independently.",
    direct:
      "I will not proceed now. Send official details in writing so I can verify them independently before considering any next step.",
    neutral:
      "Please provide official written details so I can verify them independently. No payment, codes, documents, or personal details will be shared at this stage."
  };

  if (riskLevel === "critical" || riskLevel === "high" || riskLevel === "medium") {
    return replies[tone];
  }

  return "Thanks. Please send the official written details so I can verify them independently before I decide whether to continue.";
}
