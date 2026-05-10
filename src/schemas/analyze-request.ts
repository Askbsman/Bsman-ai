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

const conversationSchema = z
  .array(
    z.object({
      role: z.string().trim().max(60).optional(),
      content: trimmedText("conversation content", 4000)
    })
  )
  .min(1)
  .max(40);

const actionContextSchema = z.object({
  proposed_action: z.enum(proposedActions).optional(),
  asset: z.string().trim().min(1).max(120).optional(),
  amount: z.union([z.string().trim().min(1).max(80), z.number().nonnegative()]).optional(),
  recipient_type: z.string().trim().min(1).max(120).optional(),
  channel: z.string().trim().min(1).max(120).optional(),
  verification_status: z.string().trim().min(1).max(120).optional(),
  sensitive_data_involved: z.boolean().optional()
});

const inputObjectSchema = z.object({
  text: trimmedText("input text", 12000).optional(),
  conversation: conversationSchema.optional(),
  context: actionContextSchema.optional()
});

export const analyzeRequestSchema = z
  .object({
    mode: z.enum(analyzeModes),
    language: z.string().trim().min(1).max(16).optional(),
    locale: z.string().trim().min(1).max(32).optional(),
    context: actionContextSchema.optional(),
    proposed_action: z.enum(proposedActions).optional(),
    asset: z.string().trim().min(1).max(120).optional(),
    amount: z.union([z.string().trim().min(1).max(80), z.number().nonnegative()]).optional(),
    recipient_type: z.string().trim().min(1).max(120).optional(),
    channel: z.string().trim().min(1).max(120).optional(),
    verification_status: z.string().trim().min(1).max(120).optional(),
    sensitive_data_involved: z.boolean().optional(),
    input: z.union([trimmedText("input", 12000), inputObjectSchema]).optional(),
    conversation: conversationSchema.optional(),
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

export type NormalizedAnalyzeRequest = Omit<AnalyzeRequest, "input" | "context"> & {
  input?: string;
};

function isInputObject(input: AnalyzeRequest["input"]): input is z.infer<typeof inputObjectSchema> {
  return typeof input === "object" && input !== null;
}

export function normalizeAnalyzeRequest(request: AnalyzeRequest): NormalizedAnalyzeRequest {
  if (!isInputObject(request.input)) {
    const context = request.context ?? {};
    return {
      ...request,
      ...context,
      input: request.input
    };
  }

  const topLevelContext = request.context ?? {};
  const inputContext = request.input.context ?? {};

  return {
    ...request,
    ...topLevelContext,
    ...inputContext,
    input: request.input.text,
    conversation: request.input.conversation ?? request.conversation
  };
}
