import { z } from "zod";

export const analyzeModes = [
  "scam_check",
  "dialogue_check",
  "offer_check",
  "manipulation_check",
  "safe_reply",
  "agent_action_check"
] as const;

export const safeReplyTones = ["calm_firm", "polite", "direct", "neutral"] as const;

export const proposedActions = [
  "send_payment",
  "share_credentials",
  "share_seed_phrase",
  "connect_wallet",
  "sign_transaction",
  "click_link",
  "download_file",
  "share_sensitive_data",
  "approve_transfer",
  "call_external_tool"
] as const;

const trimmedText = (fieldName: string, maxLength: number) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, `${fieldName} is required`).max(maxLength));

export const analyzeRequestSchema = z
  .object({
    mode: z.enum(analyzeModes),
    language: z.string().trim().min(1).max(16).optional(),
    locale: z.string().trim().min(1).max(32).optional(),
    proposed_action: z.enum(proposedActions).optional(),
    asset: z.string().trim().min(1).max(120).optional(),
    amount: z.union([z.string().trim().min(1).max(80), z.number().nonnegative()]).optional(),
    recipient_type: z.string().trim().min(1).max(120).optional(),
    channel: z.string().trim().min(1).max(120).optional(),
    verification_status: z.string().trim().min(1).max(120).optional(),
    sensitive_data_involved: z.boolean().optional(),
    input: trimmedText("input", 12000).optional(),
    conversation: z
      .array(
        z.object({
          role: z.string().trim().max(60).optional(),
          content: trimmedText("conversation content", 4000)
        })
      )
      .min(1)
      .max(40)
      .optional(),
    options: z
      .object({
        tone: z.enum(safeReplyTones).optional()
      })
      .optional()
  })
  .superRefine((value, ctx) => {
    if (value.input === undefined && value.conversation === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "input or conversation is required",
        path: ["input"]
      });
    }
  });

export type AnalyzeMode = (typeof analyzeModes)[number];
export type SafeReplyTone = (typeof safeReplyTones)[number];
export type ProposedAction = (typeof proposedActions)[number];
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
