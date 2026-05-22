import { declareDiscoveryExtension } from "@x402/extensions";
import { analyzeModes } from "../schemas/analyze-request.js";

const analyzeUrl = "https://api.callbsman.com/v1/analyze";
const fallbackAnalyzeUrl = "https://bsman-ai.onrender.com/v1/analyze";

export const bazaarIndexingLimitationNote =
  "BS Man AI exposes Bazaar-compatible metadata for x402 discovery. Official Coinbase Bazaar auto-indexing may require CDP Facilitator settlement. The current production endpoint uses xpay facilitator on Base mainnet because CDP onboarding is not available in the current setup.";

export const bazaarTags = [
  "x402",
  "AI agents",
  "scam detection",
  "risk analysis",
  "conversation intelligence",
  "agent safety",
  "payment risk",
  "wallet safety",
  "manipulation detection",
  "Base mainnet",
  "AgentCash"
] as const;

export const analyzeRequestExample = {
  mode: "agent_action_check",
  input: "string OR object with text/conversation/context",
  context: {
    proposed_action: "send_payment",
    asset: "USDC",
    amount: "250",
    recipient_type: "unknown_wallet",
    channel: "telegram",
    verification_status: "unverified"
  },
  options: {
    include_safe_reply: true,
    include_detected_patterns: true,
    risk_detail_level: "standard"
  },
  language: "en",
  locale: "US"
} as const;

export const analyzeResponseExample = {
  mode: "agent_action_check",
  risk_score: 100,
  risk_level: "critical",
  summary: "High-risk payment or wallet action detected.",
  detected_patterns: [],
  red_flags: [],
  recommended_action: "Do not proceed until the request is independently verified.",
  safe_reply: null,
  disclaimer:
    "BS Man Risk API analyzes communication risk signals only. It is not legal advice, financial advice, a lie detector, or a guarantee that something is true or false.",
  verdict: "do_not_proceed",
  requires_human_review: true,
  next_best_action: "Pause the action and verify the counterparty through an official channel.",
  action_risk_reasons: []
} as const;

export const analyzeRequestDiscoverySchema = {
  type: "object",
  required: ["mode"],
  properties: {
    mode: {
      type: "string",
      enum: analyzeModes
    },
    input: {
      oneOf: [
        {
          type: "string",
          minLength: 1,
          maxLength: 12000
        },
        {
          type: "object",
          properties: {
            text: {
              type: "string",
              minLength: 1,
              maxLength: 12000
            },
            conversation: {
              type: "array",
              items: {
                type: "object",
                required: ["content"],
                properties: {
                  role: { type: "string" },
                  content: { type: "string" }
                }
              }
            },
            context: {
              type: "object",
              additionalProperties: true
            }
          }
        }
      ],
      description:
        "Legacy string input or an object with input.text, input.conversation, and input.context."
    },
    context: {
      type: "object",
      properties: {
        proposed_action: { type: "string" },
        asset: { type: "string" },
        amount: {
          oneOf: [{ type: "string" }, { type: "number" }]
        },
        recipient_type: { type: "string" },
        channel: { type: "string" },
        verification_status: { type: "string" }
      },
      additionalProperties: true
    },
    options: {
      type: "object",
      properties: {
        include_safe_reply: { type: "boolean" },
        include_detected_patterns: { type: "boolean" },
        risk_detail_level: {
          type: "string",
          enum: ["standard"]
        }
      },
      additionalProperties: true
    },
    language: {
      type: "string",
      const: "en"
    },
    locale: {
      type: "string",
      examples: ["US"]
    }
  },
  anyOf: [{ required: ["input"] }, { required: ["conversation"] }],
  additionalProperties: true
} as const;

export const analyzeResponseDiscoverySchema = {
  type: "object",
  required: [
    "mode",
    "risk_score",
    "risk_level",
    "summary",
    "detected_patterns",
    "red_flags",
    "recommended_action",
    "safe_reply",
    "disclaimer"
  ],
  properties: {
    mode: { type: "string", enum: analyzeModes },
    risk_score: { type: "integer", minimum: 0, maximum: 100 },
    risk_level: {
      type: "string",
      enum: ["low", "medium", "high", "critical"]
    },
    summary: { type: "string" },
    detected_patterns: { type: "array" },
    red_flags: { type: "array", items: { type: "string" } },
    recommended_action: { type: "string" },
    safe_reply: { oneOf: [{ type: "string" }, { type: "null" }] },
    disclaimer: { type: "string" },
    verdict: {
      type: "string",
      enum: [
        "proceed",
        "proceed_with_caution",
        "pause_and_verify",
        "require_human_review",
        "do_not_proceed"
      ]
    },
    requires_human_review: { type: "boolean" },
    next_best_action: { type: "string" },
    action_risk_reasons: { type: "array", items: { type: "string" } }
  },
  additionalProperties: true
} as const;

export const bazaarDiscoveryMetadata = {
  name: "Call BS Man API",
  provider: "BS Man AI",
  category: "Security",
  shortDescription: "Conversation Risk Intelligence for AI agents.",
  description:
    "Call BS Man API analyzes chats, offers, and proposed agent actions for scam signals, manipulation tactics, unsafe payment requests, wallet/payment risk, and risky next steps. It returns structured JSON with risk_score, risk_level, detected_patterns, red_flags, verdict, requires_human_review, and next_best_action.",
  endpoint: analyzeUrl,
  resourceUrl: analyzeUrl,
  fallbackUrl: fallbackAnalyzeUrl,
  docsUrl: "https://callbsman.com",
  openApiUrl: "https://api.callbsman.com/docs/openapi.yaml",
  githubUrl: "https://github.com/Askbsman/Bsman-ai",
  iconUrl: "https://callbsman.com/assets/fav.png",
  mimeType: "application/json",
  mainMode: "agent_action_check",
  supportedModes: analyzeModes,
  tags: bazaarTags,
  payment: {
    protocol: "x402",
    network: "Base mainnet",
    priceUsd: "0.001",
    unit: "per analyze request"
  },
  cdpIndexingLimitation: bazaarIndexingLimitationNote,
  request: {
    example: analyzeRequestExample,
    schema: analyzeRequestDiscoverySchema
  },
  response: {
    example: analyzeResponseExample,
    schema: analyzeResponseDiscoverySchema
  }
} as const;

export const analyzeCapabilityResponse = {
  service: "Call BS Man API",
  endpoint: "POST https://api.callbsman.com/v1/analyze",
  description: "Conversation Risk Intelligence API for AI agents.",
  payment: {
    protocol: "x402",
    network: "Base mainnet",
    price: "$0.001 per analyze request"
  },
  primary_mode: "agent_action_check",
  supported_modes: analyzeModes,
  docs: "https://callbsman.com",
  openapi: "https://api.callbsman.com/docs/openapi.yaml"
} as const;

export function createBazaarAnalyzeDiscoveryExtensions() {
  const extension = declareDiscoveryExtension({
    bodyType: "json",
    input: analyzeRequestExample,
    inputSchema: analyzeRequestDiscoverySchema,
    output: {
      example: analyzeResponseExample,
      schema: analyzeResponseDiscoverySchema
    }
  });

  return {
    ...extension,
    bazaar: {
      name: bazaarDiscoveryMetadata.name,
      serviceName: bazaarDiscoveryMetadata.name,
      description: bazaarDiscoveryMetadata.description,
      tags: [...bazaarDiscoveryMetadata.tags],
      iconUrl: bazaarDiscoveryMetadata.iconUrl,
      ...extension.bazaar
    }
  };
}

export function createBazaarCapabilityDiscoveryExtensions() {
  const extension = declareDiscoveryExtension({
    output: {
      example: analyzeCapabilityResponse,
      schema: {
        type: "object",
        properties: {
          service: { type: "string" },
          endpoint: { type: "string" },
          description: { type: "string" },
          payment: { type: "object" },
          primary_mode: { type: "string" },
          supported_modes: { type: "array", items: { type: "string" } },
          docs: { type: "string" },
          openapi: { type: "string" }
        },
        additionalProperties: true
      }
    }
  });

  return {
    ...extension,
    bazaar: {
      name: bazaarDiscoveryMetadata.name,
      serviceName: bazaarDiscoveryMetadata.name,
      description: "Paid x402 discovery/capability probe for the analyze resource.",
      tags: [...bazaarDiscoveryMetadata.tags],
      iconUrl: bazaarDiscoveryMetadata.iconUrl,
      ...extension.bazaar
    }
  };
}
