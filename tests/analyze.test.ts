import { describe, expect, test } from "vitest";
import app, { createApp } from "../src/server.js";
import cases from "./fixtures/test-cases.json" with { type: "json" };

const modes = [
  "scam_check",
  "dialogue_check",
  "offer_check",
  "manipulation_check",
  "safe_reply",
  "agent_action_check"
] as const;

const disclaimer =
  "BS Man Risk API analyzes communication risk signals only. It is not legal advice, financial advice, a lie detector, or a guarantee that something is true or false.";

type FixtureCase = {
  id: string;
  mode: (typeof modes)[number];
  input: string;
  expected: {
    risk_level?: "low" | "medium" | "high" | "critical";
    min_risk_score?: number;
    max_risk_score?: number;
    must_detect?: string[];
    must_include_red_flags?: string[];
    safe_reply_contains?: string;
  };
};

async function analyze(payload: unknown) {
  return app.request("/v1/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function analyzeRaw(body: string) {
  return app.request("/v1/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body
  });
}

function expectSafeError(body: unknown) {
  const serialized = JSON.stringify(body).toLowerCase();
  expect(serialized).not.toContain("stack");
  expect(serialized).not.toContain("trace");
  expect(serialized).not.toContain("src/");
  expect(serialized).not.toContain("node_modules");
}

describe("service endpoints", () => {
  test("GET /health returns service status", async () => {
    const response = await app.request("/health");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      service: "bsman-risk-api",
      version: "0.1.0"
    });
  });

  test("GET / returns public service metadata", async () => {
    const response = await app.request("/");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      name: "BS Man AI",
      description: "Conversation Risk Intelligence API for AI agents.",
      version: "0.1.0",
      endpoints: {
        health: "/health",
        analyze: "/v1/analyze",
        openapi: "/docs/openapi.yaml"
      }
    });
  });

  test("GET /docs/openapi.yaml serves the OpenAPI document", async () => {
    const response = await app.request("/docs/openapi.yaml");
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/yaml");
    expect(body).toContain("/health:");
    expect(body).toContain("/v1/analyze:");
  });
});

describe("x402 endpoint policy", () => {
  test("X402 disabled keeps POST /v1/analyze behavior unchanged", async () => {
    const x402DisabledApp = createApp();
    const response = await x402DisabledApp.request("/v1/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "scam_check",
        input: "Your wallet is suspended. Click this urgent link and enter your seed phrase."
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.risk_level).toBe("critical");
  });

  test("x402 protection can require payment for POST /v1/analyze only", async () => {
    const protectedApp = createApp({
      x402Middleware: async (c, next) => {
        if (c.req.method === "POST" && c.req.path === "/v1/analyze") {
          return c.json(
            {
              error: {
                code: "PAYMENT_REQUIRED",
                message: "x402 payment required.",
                details: {
                  accepts: [
                    {
                      scheme: "exact",
                      network: "eip155:84532",
                      price: "$0.001"
                    }
                  ]
                }
              }
            },
            402
          );
        }

        await next();
      }
    });

    const rootResponse = await protectedApp.request("/");
    const healthResponse = await protectedApp.request("/health");
    const docsResponse = await protectedApp.request("/docs/openapi.yaml");
    const analyzeResponse = await protectedApp.request("/v1/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "scam_check",
        input: "Your wallet is suspended. Click this urgent link and enter your seed phrase."
      })
    });
    const analyzeBody = await analyzeResponse.json();

    expect(rootResponse.status).toBe(200);
    expect(healthResponse.status).toBe(200);
    expect(docsResponse.status).toBe(200);
    expect(analyzeResponse.status).toBe(402);
    expect(analyzeBody.error.code).toBe("PAYMENT_REQUIRED");
  });
});

describe("POST /v1/analyze", () => {
  test.each(modes)("returns structured analysis for %s", async (mode) => {
    const response = await analyze({
      mode,
      input:
        "You must decide today and send gift cards before telling anyone else."
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      mode,
      disclaimer
    });
    expect(body.risk_score).toBeGreaterThanOrEqual(0);
    expect(body.risk_score).toBeLessThanOrEqual(100);
    expect(["low", "medium", "high", "critical"]).toContain(body.risk_level);
    expect(typeof body.summary).toBe("string");
    expect(Array.isArray(body.detected_patterns)).toBe(true);
    for (const pattern of body.detected_patterns) {
      expect(pattern.confidence).toBeGreaterThanOrEqual(0);
      expect(pattern.confidence).toBeLessThanOrEqual(1);
      expect(typeof pattern.evidence_snippet).toBe("string");
      expect(pattern.evidence_snippet.length).toBeLessThanOrEqual(160);
    }
    expect(Array.isArray(body.red_flags)).toBe(true);
    expect(typeof body.recommended_action).toBe("string");
    expect(body.safe_reply === null || typeof body.safe_reply === "string").toBe(
      true
    );
    if (mode === "agent_action_check") {
      expect([
        "proceed",
        "proceed_with_caution",
        "pause_and_verify",
        "require_human_review",
        "do_not_proceed"
      ]).toContain(body.verdict);
      expect(typeof body.requires_human_review).toBe("boolean");
      expect(typeof body.next_best_action).toBe("string");
      expect(Array.isArray(body.action_risk_reasons)).toBe(true);
    }
  });

  test("keeps existing modes backward compatible without action verdict fields", async () => {
    for (const mode of modes.filter((mode) => mode !== "agent_action_check")) {
      const response = await analyze({
        mode,
        input: "Please review this message and verify details before acting."
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("mode", mode);
      expect(body).toHaveProperty("risk_score");
      expect(body).toHaveProperty("risk_level");
      expect(body).toHaveProperty("summary");
      expect(body).toHaveProperty("detected_patterns");
      expect(body).toHaveProperty("red_flags");
      expect(body).toHaveProperty("recommended_action");
      expect(body).toHaveProperty("safe_reply");
      expect(body).toHaveProperty("disclaimer");
      expect(body.verdict).toBeUndefined();
      expect(body.requires_human_review).toBeUndefined();
      expect(body.next_best_action).toBeUndefined();
      expect(body.action_risk_reasons).toBeUndefined();
    }
  });

  test("generates a safe reply only for safe_reply mode", async () => {
    const risky = "Wire the money now and keep this secret from your family.";

    const safeReplyResponse = await analyze({ mode: "safe_reply", input: risky });
    const scamResponse = await analyze({ mode: "scam_check", input: risky });

    expect((await safeReplyResponse.json()).safe_reply).toContain(
      "I am not comfortable"
    );
    expect((await scamResponse.json()).safe_reply).toBeNull();
  });

  test("supports safe_reply tone options without direct scam accusations", async () => {
    const risky = "Send the deposit now and do not tell anyone.";
    const tones = ["calm_firm", "polite", "direct", "neutral"] as const;

    for (const tone of tones) {
      const response = await analyze({
        mode: "safe_reply",
        input: risky,
        options: { tone }
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.safe_reply).toContain("verify");
      expect(body.safe_reply.toLowerCase()).not.toContain("scammer");
      expect(body.safe_reply.toLowerCase()).not.toContain("scam");
      expect(body.recommended_action).toBe(
        "Use the generated reply to set a boundary and request verification."
      );
    }
  });

  test("dialogue_check analyzes conversation arrays and preserves short evidence", async () => {
    const response = await analyze({
      mode: "dialogue_check",
      conversation: [
        {
          role: "counterparty",
          content: "I care about you and this is a private investment group."
        },
        {
          role: "counterparty",
          content: "Do not ask anyone else. Send crypto today before the window closes."
        }
      ]
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.risk_level).toMatch(/high|critical/);
    expect(body.detected_patterns.map((pattern: { id: string }) => pattern.id)).toEqual(
      expect.arrayContaining(["MANIP_ISOLATION", "MANIP_URGENCY_PRESSURE"])
    );
    for (const pattern of body.detected_patterns) {
      expect(pattern.evidence_snippet.length).toBeLessThanOrEqual(160);
    }
  });

  test("manipulation_check does not over-score normal business text", async () => {
    const response = await analyze({
      mode: "manipulation_check",
      input:
        "Please review the proposal, share any questions, and let us know if next Tuesday works for a call."
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.risk_level).toBe("low");
    expect(body.risk_score).toBeLessThanOrEqual(20);
  });

  test.each([
    [
      "normal invoice with company details",
      "Invoice INV-2041 from Northstar Labs LLC is due June 30. Please pay through the company portal listed in our contract."
    ],
    [
      "normal job interview request",
      "Thanks for applying. Are you available for a video interview next week? No payment or personal banking details are needed."
    ],
    [
      "normal marketplace negotiation",
      "Would you accept $80 if I pick up the item in person and pay through the marketplace checkout?"
    ],
    [
      "normal rental viewing request",
      "Can I view the apartment on Saturday before submitting an application or deposit?"
    ],
    [
      "normal SaaS subscription notice",
      "Your SaaS subscription renews next month. Manage billing from your account settings on our official website."
    ]
  ])("%s stays below high risk", async (_name, input) => {
    const response = await analyze({ mode: "offer_check", input });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(["low", "medium"]).toContain(body.risk_level);
    expect(body.risk_score).toBeLessThan(50);
  });

  test.each([
    [
      "seed phrase phishing",
      "Your wallet is suspended. Click this urgent link and enter your seed phrase."
    ],
    [
      "crypto payment pressure",
      "Send crypto today for guaranteed allocation and do not ask anyone else."
    ]
  ])("%s returns high or critical", async (_name, input) => {
    const response = await analyze({ mode: "scam_check", input });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(["high", "critical"]).toContain(body.risk_level);
  });

  test.each([
    [
      "send_payment to unknown wallet after crypto offer",
      {
        mode: "agent_action_check",
        input:
          "This crypto investment guarantees 20% weekly returns. Send crypto today to secure your allocation.",
        proposed_action: "send_payment",
        asset: "USDC",
        amount: "100",
        recipient_type: "unknown_wallet",
        channel: "Telegram",
        verification_status: "unverified",
        sensitive_data_involved: false
      },
      "critical",
      "do_not_proceed"
    ],
    [
      "share_seed_phrase",
      {
        mode: "agent_action_check",
        input: "Support says the wallet is suspended and needs the recovery phrase.",
        proposed_action: "share_seed_phrase",
        asset: "wallet",
        recipient_type: "support_agent",
        channel: "web_chat",
        verification_status: "unverified",
        sensitive_data_involved: true
      },
      "critical",
      "do_not_proceed"
    ],
    [
      "suspicious fake support link",
      {
        mode: "agent_action_check",
        input: "This is support. Click this urgent link to verify your account.",
        proposed_action: "click_link",
        recipient_type: "support_agent",
        channel: "email",
        verification_status: "unverified",
        sensitive_data_involved: true
      },
      /high|critical/,
      /pause_and_verify|require_human_review|do_not_proceed/
    ],
    [
      "normal verified SaaS invoice",
      {
        mode: "agent_action_check",
        input:
          "Invoice INV-2041 from Northstar Labs LLC is due June 30. Please pay through the company portal listed in our contract.",
        proposed_action: "send_payment",
        asset: "USD",
        amount: "49",
        recipient_type: "known_vendor",
        channel: "company_portal",
        verification_status: "verified",
        sensitive_data_involved: false
      },
      /low|medium/,
      /proceed|proceed_with_caution/
    ],
    [
      "normal job interview scheduling",
      {
        mode: "agent_action_check",
        input:
          "Thanks for applying. Are you available for a video interview next week? No payment or personal banking details are needed.",
        proposed_action: "call_external_tool",
        recipient_type: "known_company",
        channel: "email",
        verification_status: "verified",
        sensitive_data_involved: false
      },
      "low",
      "proceed"
    ],
    [
      "marketplace off-platform payment",
      {
        mode: "agent_action_check",
        input: "The seller wants payment off-platform by wire transfer before showing proof of shipment.",
        proposed_action: "send_payment",
        asset: "USD",
        amount: "800",
        recipient_type: "marketplace_seller",
        channel: "marketplace_chat",
        verification_status: "unverified",
        sensitive_data_involved: false
      },
      /high|critical/,
      /require_human_review|do_not_proceed/
    ],
    [
      "unverified Telegram admin wallet connection",
      {
        mode: "agent_action_check",
        input: "I am the Telegram admin. Verify your wallet with this link or you will be removed.",
        proposed_action: "connect_wallet",
        asset: "wallet",
        recipient_type: "telegram_admin",
        channel: "Telegram",
        verification_status: "unverified",
        sensitive_data_involved: true
      },
      "critical",
      "do_not_proceed"
    ],
    [
      "risky text without action context",
      {
        mode: "agent_action_check",
        input: "Your wallet is suspended. Click this urgent link and enter your seed phrase."
      },
      /high|critical/,
      /pause_and_verify|require_human_review|do_not_proceed/
    ]
  ])("%s returns agent action verdict", async (_name, payload, riskLevel, verdict) => {
    const response = await analyze(payload);
    const body = await response.json();

    expect(response.status).toBe(200);
    if (typeof riskLevel === "string") {
      expect(body.risk_level).toBe(riskLevel);
    } else {
      expect(body.risk_level).toMatch(riskLevel);
    }
    if (typeof verdict === "string") {
      expect(body.verdict).toBe(verdict);
    } else {
      expect(body.verdict).toMatch(verdict);
    }
    expect(typeof body.requires_human_review).toBe("boolean");
    expect(typeof body.next_best_action).toBe("string");
    expect(Array.isArray(body.action_risk_reasons)).toBe(true);
    expect(body.action_risk_reasons.length).toBeGreaterThan(0);
  });

  test("supports existing string input with nested context", async () => {
    const response = await analyze({
      mode: "agent_action_check",
      input:
        "This crypto investment guarantees 20% weekly returns. Send crypto today to secure your allocation.",
      context: {
        proposed_action: "send_payment",
        asset: "USDC",
        amount: "100",
        recipient_type: "unknown_wallet",
        channel: "Telegram",
        verification_status: "unverified",
        sensitive_data_involved: false
      }
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.risk_level).toBe("critical");
    expect(body.verdict).toBe("do_not_proceed");
    expect(body.requires_human_review).toBe(true);
  });

  test("supports agent-friendly object input with text, conversation, and context", async () => {
    const response = await analyze({
      mode: "agent_action_check",
      input: {
        text: "Support says the wallet is suspended.",
        conversation: [
          {
            role: "counterparty",
            content: "Click this urgent link and enter your seed phrase."
          }
        ],
        context: {
          proposed_action: "share_seed_phrase",
          asset: "wallet",
          recipient_type: "support_agent",
          channel: "web_chat",
          verification_status: "unverified",
          sensitive_data_involved: true
        }
      }
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.risk_level).toBe("critical");
    expect(body.verdict).toBe("do_not_proceed");
    expect(
      body.detected_patterns.map((pattern: { id: string }) => pattern.id)
    ).toContain("SCAM_WALLET_SEED_PHRASE_THEFT");
  });

  test("input.context takes priority over top-level context", async () => {
    const response = await analyze({
      mode: "agent_action_check",
      input: {
        text: "Please pay the invoice through the company portal listed in our contract.",
        context: {
          proposed_action: "send_payment",
          recipient_type: "known_vendor",
          channel: "company_portal",
          verification_status: "verified",
          sensitive_data_involved: false
        }
      },
      context: {
        proposed_action: "share_seed_phrase",
        recipient_type: "unknown_wallet",
        channel: "Telegram",
        verification_status: "unverified",
        sensitive_data_involved: true
      }
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(["low", "medium"]).toContain(body.risk_level);
    expect(["proceed", "proceed_with_caution"]).toContain(body.verdict);
    expect(body.action_risk_reasons.join(" ")).not.toContain("seed phrase");
  });

  test("rejects invalid mode with a validation error", async () => {
    const response = await analyze({ mode: "truth_check", input: "hello" });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("Invalid request body.");
    expect(Array.isArray(body.error.details)).toBe(true);
    expectSafeError(body);
  });

  test("rejects empty input with a validation error", async () => {
    const response = await analyze({ mode: "scam_check", input: "   " });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("Invalid request body.");
    expect(Array.isArray(body.error.details)).toBe(true);
    expectSafeError(body);
  });

  test("rejects missing input and conversation with the standard error shape", async () => {
    const response = await analyze({ mode: "scam_check" });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Invalid request body."
    });
    expect(Array.isArray(body.error.details)).toBe(true);
    expectSafeError(body);
  });

  test("rejects invalid JSON with the standard error shape", async () => {
    const response = await analyzeRaw("{ not-json");
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toEqual({
      code: "VALIDATION_ERROR",
      message: "Invalid request body.",
      details: []
    });
    expectSafeError(body);
  });

  test("rejects unsupported language", async () => {
    const response = await analyze({
      mode: "scam_check",
      input: "Bonjour, envoyez de l'argent maintenant.",
      language: "fr"
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toEqual({
      code: "UNSUPPORTED_LANGUAGE",
      message: "BS Man AI v0.1 supports English only.",
      details: {
        supported_languages: ["en"]
      }
    });
    expectSafeError(body);
  });

  test.each((cases as FixtureCase[]).map((testCase) => [testCase.id, testCase]))(
    "scores fixture: %s",
    async (_name, testCase) => {
      const response = await analyze({
        mode: testCase.mode,
        input: testCase.input
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      if (testCase.expected.risk_level !== undefined) {
        expect(body.risk_level).toBe(testCase.expected.risk_level);
      }
      if (testCase.expected.min_risk_score !== undefined) {
        expect(body.risk_score).toBeGreaterThanOrEqual(
          testCase.expected.min_risk_score
        );
      }
      if (testCase.expected.max_risk_score !== undefined) {
        expect(body.risk_score).toBeLessThanOrEqual(
          testCase.expected.max_risk_score
        );
      }
      if (testCase.expected.must_detect !== undefined) {
        const detectedIds = body.detected_patterns.map(
          (pattern: { id: string }) => pattern.id
        );
        expect(detectedIds).toEqual(
          expect.arrayContaining(testCase.expected.must_detect)
        );
      }
      if (testCase.expected.must_include_red_flags !== undefined) {
        const redFlagText = body.red_flags.join(" ").toLowerCase();
        for (const expectedText of testCase.expected.must_include_red_flags) {
          expect(redFlagText).toContain(expectedText.toLowerCase());
        }
      }
      if (testCase.expected.safe_reply_contains !== undefined) {
        expect(body.safe_reply).toContain(testCase.expected.safe_reply_contains);
      }
    }
  );
});
