import { describe, expect, test, vi } from "vitest";
import app, { createApp } from "../src/server.js";
import type { X402Config } from "../src/config/x402.js";
import { bazaarDiscoveryMetadata } from "../src/config/discovery.js";
import {
  createX402AnalyzeRoutes,
  createX402Middleware
} from "../src/middleware/x402.js";
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

const validX402Config: X402Config = {
  enabled: true,
  network: "eip155:84532",
  payTo: "0x0000000000000000000000000000000000000000",
  facilitatorUrl: "https://x402.org/facilitator",
  analyzePriceUsd: "0.001",
  agentActionPriceUsd: "0.005"
};

const baseMainnetX402Config: X402Config = {
  ...validX402Config,
  network: "eip155:8453",
  payTo: "0x7642CCEd89398Bd638d9Ee2F82dA8cd3FC01ADA1"
};

async function requestAnalyzeWithConfig(config: X402Config) {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  try {
    const x402App = createApp({ x402Config: config });
    return await x402App.request("/v1/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "scam_check",
        input: "Your wallet is suspended. Click this urgent link and enter your seed phrase."
      })
    });
  } finally {
    warnSpy.mockRestore();
  }
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
    expect(body).toMatchObject({
      name: "BS Man AI",
      service: "Call BS Man API",
      description: "Conversation Risk Intelligence API for AI agents.",
      version: "0.1.0",
      docs: "https://callbsman.com",
      openapi: "https://api.callbsman.com/openapi.json",
      endpoints: {
        health: "/health",
        analyze: "/v1/analyze",
        analyze_probe: "/v1/analyze",
        openapi: "/openapi.json",
        openapi_json: "/openapi.json",
        openapi_yaml: "/openapi.yaml"
      },
      resources: [
        {
          name: "Call BS Man API Analyze",
          url: "https://api.callbsman.com/v1/analyze",
          path: "/v1/analyze",
          methods: ["GET", "POST"],
          primary_method: "POST",
          payment: {
            protocol: "x402",
            network: "Base mainnet",
            price: "$0.001 per analyze request"
          },
          request: {
            mode: "agent_action_check"
          }
        }
      ]
    });
    expect(body.sample_endpoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: "POST",
          url: "https://api.callbsman.com/v1/analyze",
          price: "$0.001"
        })
      ])
    );
  });

  test("CORS preflight allows the public console to call the API", async () => {
    const response = await app.request("/v1/analyze", {
      method: "OPTIONS",
      headers: {
        origin: "https://callbsman.com",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type"
      }
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://callbsman.com"
    );
    expect(response.headers.get("access-control-allow-methods")).toContain(
      "POST"
    );
    expect(response.headers.get("access-control-allow-headers")).toContain(
      "Content-Type"
    );
  });

  test("demo analyze endpoint allows three free checks per client", async () => {
    const payload = {
      mode: "agent_action_check",
      input: "A Telegram admin says I must connect my wallet today or lose access.",
      context: {
        proposed_action: "connect_wallet",
        recipient_type: "telegram_admin",
        channel: "telegram",
        verification_status: "unverified"
      },
      language: "en",
      locale: "US"
    };
    const headers = {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.77"
    };

    for (const remaining of [2, 1, 0]) {
      const response = await app.request("/v1/demo/analyze", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.risk_score).toBeGreaterThanOrEqual(0);
      expect(body.demo).toMatchObject({
        free: true,
        limit: 3,
        remaining
      });
    }

    const limitedResponse = await app.request("/v1/demo/analyze", {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    const limitedBody = await limitedResponse.json();

    expect(limitedResponse.status).toBe(429);
    expect(limitedBody.error.code).toBe("DEMO_LIMIT_REACHED");
  });

  test("demo analyze endpoint remains free when x402 is enabled", async () => {
    const protectedApp = createApp({
      x402Config: {
        ...validX402Config,
        enabled: true
      },
      x402Middleware: createX402Middleware(
        {
          ...validX402Config,
          enabled: true
        },
        {
          createProtectedMiddleware: () => ({
            initialize: async () => undefined,
            handler: async (c, next) => {
              if (c.req.path === "/v1/analyze") {
                return c.json({ error: "Payment required" }, 402);
              }
              await next();
            }
          })
        }
      )
    });

    const response = await protectedApp.request("/v1/demo/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.78"
      },
      body: JSON.stringify({
        mode: "scam_check",
        input: "Guaranteed crypto returns if I send money now.",
        language: "en"
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.demo.remaining).toBe(2);
  });

  test("GET /docs/openapi.yaml serves the OpenAPI document", async () => {
    const response = await app.request("/docs/openapi.yaml");
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/yaml");
    expect(body).toContain("/health:");
    expect(body).toContain("/v1/analyze:");
  });

  test("GET OpenAPI aliases serve JSON and YAML documents", async () => {
    const jsonResponse = await app.request("/openapi.json");
    const docsJsonResponse = await app.request("/docs/openapi.json");
    const yamlResponse = await app.request("/openapi.yaml");
    const jsonBody = await jsonResponse.json();
    const docsJsonBody = await docsJsonResponse.json();
    const yamlBody = await yamlResponse.text();

    expect(jsonResponse.status).toBe(200);
    expect(docsJsonResponse.status).toBe(200);
    expect(yamlResponse.status).toBe(200);
    expect(jsonResponse.headers.get("content-type")).toContain("application/json");
    expect(docsJsonResponse.headers.get("content-type")).toContain(
      "application/json"
    );
    expect(yamlResponse.headers.get("content-type")).toContain("text/yaml");
    expect(jsonBody.openapi).toBe("3.1.0");
    expect(jsonBody.paths["/v1/analyze"].post["x-x402"]).toMatchObject({
      payment: "x402",
      resource: "https://api.callbsman.com/v1/analyze"
    });
    expect(jsonBody.paths["/v1/analyze"].get["x-payment-info"]).toMatchObject({
      price: {
        mode: "fixed",
        currency: "USD",
        amount: "0.001000"
      },
      protocols: [{ x402: {} }]
    });
    expect(jsonBody.paths["/v1/analyze"].post["x-payment-info"]).toMatchObject({
      price: {
        mode: "fixed",
        currency: "USD",
        amount: "0.001000"
      },
      protocols: [{ x402: {} }]
    });
    expect(jsonBody.paths["/v1/analyze"].get.responses["402"]).toMatchObject({
      description: "Payment Required"
    });
    expect(jsonBody.paths["/v1/analyze"].post.responses["402"]).toMatchObject({
      description: "Payment Required"
    });
    expect(docsJsonBody.paths["/v1/analyze"].get.summary).toContain(
      "discovery"
    );
    expect(yamlBody).toContain("/v1/analyze:");
    expect(yamlBody).toContain("x-payment-info:");
    expect(yamlBody).toContain('amount: "0.001000"');
  });
});

describe("x402 endpoint policy", () => {
  test("x402 analyze route config exposes Bazaar-compatible discovery metadata", () => {
    const routes = createX402AnalyzeRoutes(validX402Config);
    const route = routes["POST /v1/analyze"];
    const getRoute = routes["GET /v1/analyze"];

    expect(route.resource).toBe("https://api.callbsman.com/v1/analyze");
    expect(route.description).toContain(
      "Conversation Risk Intelligence API for AI agents"
    );
    expect(route.mimeType).toBe("application/json");
    expect(route.accepts).toMatchObject({
      extra: {
        bsman: {
          name: "Call BS Man API",
          provider: "BS Man AI",
          category: "Security",
          tags: expect.arrayContaining(["x402", "AI agents", "AgentCash"]),
          fallbackUrl: "https://bsman-ai.onrender.com/v1/analyze"
        }
      }
    });
    expect(route.extensions?.bazaar).toMatchObject({
      info: {
        input: {
          type: "http",
          bodyType: "json"
        },
        output: {
          type: "json"
        }
      }
    });
    expect(getRoute.resource).toBe("https://api.callbsman.com/v1/analyze");
    expect(getRoute.description).toContain(
      "Conversation Risk Intelligence API for AI agents"
    );
    expect(getRoute.mimeType).toBe("application/json");
  });

  test("x402 unpaid response body mirrors canonical PaymentRequired fields", async () => {
    const routes = createX402AnalyzeRoutes(baseMainnetX402Config);
    const route = routes["POST /v1/analyze"];
    const getRoute = routes["GET /v1/analyze"];

    const responseBody = await route.unpaidResponseBody?.({
      adapter: {
        getHeader: () => undefined,
        getMethod: () => "POST",
        getPath: () => "/v1/analyze",
        getUrl: () => "https://api.callbsman.com/v1/analyze",
        getAcceptHeader: () => "application/json",
        getUserAgent: () => "agentcash"
      },
      method: "POST",
      path: "/v1/analyze"
    });
    const getResponseBody = await getRoute.unpaidResponseBody?.({
      adapter: {
        getHeader: () => undefined,
        getMethod: () => "GET",
        getPath: () => "/v1/analyze",
        getUrl: () => "https://api.callbsman.com/v1/analyze",
        getAcceptHeader: () => "application/json",
        getUserAgent: () => "agentcash"
      },
      method: "GET",
      path: "/v1/analyze"
    });

    expect(responseBody?.contentType).toBe("application/json");
    expect(responseBody?.body).toMatchObject({
      x402Version: 2,
      error: "Payment required",
      resource: {
        url: "https://api.callbsman.com/v1/analyze",
        mimeType: "application/json"
      },
      accepts: [
        {
          scheme: "exact",
          network: "eip155:8453",
          amount: "1000",
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          payTo: "0x7642CCEd89398Bd638d9Ee2F82dA8cd3FC01ADA1",
          maxTimeoutSeconds: 60,
          extra: {
            name: "USD Coin",
            version: "2",
            bsman: {
              name: "Call BS Man API",
              provider: "BS Man AI",
              category: "Security",
              tags: expect.arrayContaining(["x402", "AI agents", "AgentCash"])
            }
          }
        }
      ],
      extensions: {
        bazaar: expect.any(Object)
      },
      metadata: {
        name: "Call BS Man API",
        provider: "BS Man AI",
        description: "Conversation Risk Intelligence API for AI agents.",
        openApiUrl: "https://api.callbsman.com/docs/openapi.yaml"
      }
    });
    expect(
      (responseBody?.body as { accepts: Array<{ extra: Record<string, unknown> }> })
        .accepts[0].extra.name
    ).not.toBe("Call BS Man API");
    expect(getResponseBody?.body).toMatchObject({
      x402Version: 2,
      resource: {
        url: "https://api.callbsman.com/v1/analyze"
      },
      accepts: [
        {
          amount: "1000",
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        }
      ],
      method: "GET",
      endpoint: "GET https://api.callbsman.com/v1/analyze"
    });
    expectSafeError(responseBody?.body);
  });

  test("canonical Bazaar metadata uses the public API endpoint and product details", () => {
    expect(bazaarDiscoveryMetadata.name).toBe("Call BS Man API");
    expect(bazaarDiscoveryMetadata.provider).toBe("BS Man AI");
    expect(bazaarDiscoveryMetadata.category).toBe("Security");
    expect(bazaarDiscoveryMetadata.resourceUrl).toBe(
      "https://api.callbsman.com/v1/analyze"
    );
    expect(bazaarDiscoveryMetadata.fallbackUrl).toBe(
      "https://bsman-ai.onrender.com/v1/analyze"
    );
    expect(bazaarDiscoveryMetadata.payment.priceUsd).toBe("0.001");
    expect(bazaarDiscoveryMetadata.supportedModes).toEqual(modes);
    expect(bazaarDiscoveryMetadata.tags).toEqual(
      expect.arrayContaining(["x402", "AgentCash", "Base mainnet"])
    );
  });

  test("X402 disabled keeps POST /v1/analyze behavior unchanged", async () => {
    const x402DisabledApp = createApp({
      x402Config: {
        ...validX402Config,
        enabled: false,
        payTo: "",
        facilitatorUrl: ""
      }
    });
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

  test("X402 disabled returns capability JSON for GET /v1/analyze", async () => {
    const x402DisabledApp = createApp({
      x402Config: {
        ...validX402Config,
        enabled: false,
        payTo: "",
        facilitatorUrl: ""
      }
    });

    const response = await x402DisabledApp.request("/v1/analyze");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      service: "Call BS Man API",
      endpoint: "POST https://api.callbsman.com/v1/analyze",
      description: "Conversation Risk Intelligence API for AI agents.",
      payment: {
        protocol: "x402",
        network: "Base mainnet",
        price: "$0.001 per analyze request"
      },
      primary_mode: "agent_action_check",
      supported_modes: [
        "scam_check",
        "dialogue_check",
        "offer_check",
        "manipulation_check",
        "safe_reply",
        "agent_action_check"
      ],
      docs: "https://callbsman.com",
      openapi: "https://api.callbsman.com/docs/openapi.yaml"
    });
  });

  test("x402 protection can require payment for POST and GET /v1/analyze only", async () => {
    const protectedApp = createApp({
      x402Middleware: async (c, next) => {
        if (
          (c.req.method === "POST" || c.req.method === "GET") &&
          c.req.path === "/v1/analyze"
        ) {
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
    const openApiJsonResponse = await protectedApp.request("/openapi.json");
    const analyzeGetResponse = await protectedApp.request("/v1/analyze");
    const analyzeResponse = await protectedApp.request("/v1/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "scam_check",
        input: "Your wallet is suspended. Click this urgent link and enter your seed phrase."
      })
    });
    const analyzeGetBody = await analyzeGetResponse.json();
    const analyzeBody = await analyzeResponse.json();

    expect(rootResponse.status).toBe(200);
    expect(healthResponse.status).toBe(200);
    expect(docsResponse.status).toBe(200);
    expect(openApiJsonResponse.status).toBe(200);
    expect(analyzeGetResponse.status).toBe(402);
    expect(analyzeResponse.status).toBe(402);
    expect(analyzeGetBody.error.code).toBe("PAYMENT_REQUIRED");
    expect(analyzeBody.error.code).toBe("PAYMENT_REQUIRED");
  });

  test("enabled x402 protects GET /v1/analyze with a PAYMENT-REQUIRED header", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const paymentRequired = Buffer.from(
      JSON.stringify({
        x402Version: 2,
        resource: "https://api.callbsman.com/v1/analyze",
        accepts: []
      })
    ).toString("base64url");
    const protectedApp = createApp({
      x402Middleware: createX402Middleware(validX402Config, {
        createProtectedMiddleware: () => ({
          initialize: async () => undefined,
          handler: async (c) => {
            c.header("PAYMENT-REQUIRED", paymentRequired);
            return c.json({ error: "Payment required" }, 402);
          }
        })
      })
    });

    const response = await protectedApp.request("/v1/analyze");

    infoSpy.mockRestore();
    warnSpy.mockRestore();
    expect(response.status).toBe(402);
    expect(response.headers.get("PAYMENT-REQUIRED")).toBe(paymentRequired);
    expect(
      JSON.parse(
        Buffer.from(response.headers.get("PAYMENT-REQUIRED")!, "base64url").toString(
          "utf8"
        )
      )
    ).toMatchObject({
      resource: "https://api.callbsman.com/v1/analyze"
    });
  });

  test("paid GET /v1/analyze can return capability JSON after x402 verification", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const protectedApp = createApp({
      x402Middleware: createX402Middleware(validX402Config, {
        createProtectedMiddleware: () => ({
          initialize: async () => undefined,
          handler: async (_c, next) => {
            await next();
          }
        })
      })
    });

    const response = await protectedApp.request("/v1/analyze");
    const body = await response.json();

    infoSpy.mockRestore();
    warnSpy.mockRestore();
    expect(response.status).toBe(200);
    expect(body.service).toBe("Call BS Man API");
    expect(body.endpoint).toBe("POST https://api.callbsman.com/v1/analyze");
    expect(body.primary_mode).toBe("agent_action_check");
  });

  test("enabled x402 with missing pay-to returns a safe config error", async () => {
    const response = await requestAnalyzeWithConfig({
      ...validX402Config,
      payTo: ""
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: {
        code: "X402_CONFIG_ERROR",
        message: "x402 is enabled but payment configuration is invalid.",
        details: {
          missing: ["X402_PAY_TO"],
          invalid: []
        }
      }
    });
    expectSafeError(body);
  });

  test("enabled x402 with invalid pay-to returns a safe config error", async () => {
    const response = await requestAnalyzeWithConfig({
      ...validX402Config,
      payTo: "not-a-wallet"
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("X402_CONFIG_ERROR");
    expect(body.error.details.invalid).toContain("X402_PAY_TO");
    expectSafeError(body);
  });

  test("enabled x402 with missing facilitator URL returns a safe config error", async () => {
    const response = await requestAnalyzeWithConfig({
      ...validX402Config,
      facilitatorUrl: ""
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("X402_CONFIG_ERROR");
    expect(body.error.details.missing).toContain("X402_FACILITATOR_URL");
    expectSafeError(body);
  });

  test("enabled x402 with missing network returns a safe config error", async () => {
    const response = await requestAnalyzeWithConfig({
      ...validX402Config,
      network: ""
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("X402_CONFIG_ERROR");
    expect(body.error.details.missing).toContain("X402_NETWORK");
    expectSafeError(body);
  });

  test("GET /health remains free when enabled x402 config is invalid", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const invalidConfigApp = createApp({
      x402Config: {
        ...validX402Config,
        payTo: "",
        facilitatorUrl: ""
      }
    });

    const response = await invalidConfigApp.request("/health");
    const body = await response.json();

    warnSpy.mockRestore();
    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      service: "bsman-risk-api",
      version: "0.1.0"
    });
  });

  test("x402 config errors are complete JSON and do not expose stack traces", async () => {
    const response = await requestAnalyzeWithConfig({
      ...validX402Config,
      network: "base-sepolia",
      payTo: "0x123",
      facilitatorUrl: "not-a-url",
      analyzePriceUsd: "0",
      agentActionPriceUsd: "-1"
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toMatchObject({
      code: "X402_CONFIG_ERROR",
      message: "x402 is enabled but payment configuration is invalid."
    });
    expect(body.error.details.invalid).toEqual(
      expect.arrayContaining([
        "X402_NETWORK",
        "X402_PAY_TO",
        "X402_FACILITATOR_URL",
        "X402_PRICE_ANALYZE_USD",
        "X402_PRICE_AGENT_ACTION_USD"
      ])
    );
    expectSafeError(body);
  });

  test("enabled x402 initializes the payment middleware once before paid requests", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let initializeCalls = 0;
    let handlerCalls = 0;
    const initializedApp = createApp({
      x402Middleware: createX402Middleware(validX402Config, {
        createProtectedMiddleware: () => ({
          initialize: async () => {
            initializeCalls += 1;
          },
          handler: async (c) => {
            handlerCalls += 1;
            return c.json(
              {
                error: {
                  code: "PAYMENT_REQUIRED",
                  message: "x402 payment required.",
                  details: []
                }
              },
              402
            );
          }
        })
      })
    });

    const firstResponse = await initializedApp.request("/v1/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "scam_check", input: "Send crypto today." })
    });
    const secondResponse = await initializedApp.request("/v1/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "scam_check", input: "Send crypto today." })
    });

    infoSpy.mockRestore();
    warnSpy.mockRestore();
    expect(firstResponse.status).toBe(402);
    expect(secondResponse.status).toBe(402);
    expect(initializeCalls).toBe(1);
    expect(handlerCalls).toBe(2);
  });

  test("enabled x402 does not initialize payment middleware for free endpoints", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let initializeCalls = 0;
    const initializedApp = createApp({
      x402Middleware: createX402Middleware(validX402Config, {
        createProtectedMiddleware: () => ({
          initialize: async () => {
            initializeCalls += 1;
          },
          handler: async (c) => c.json({}, 402)
        })
      })
    });

    const rootResponse = await initializedApp.request("/");
    const healthResponse = await initializedApp.request("/health");
    const docsResponse = await initializedApp.request("/docs/openapi.yaml");
    const openApiJsonResponse = await initializedApp.request("/openapi.json");
    const openApiYamlResponse = await initializedApp.request("/openapi.yaml");

    infoSpy.mockRestore();
    warnSpy.mockRestore();
    expect(rootResponse.status).toBe(200);
    expect(healthResponse.status).toBe(200);
    expect(docsResponse.status).toBe(200);
    expect(openApiJsonResponse.status).toBe(200);
    expect(openApiYamlResponse.status).toBe(200);
    expect(initializeCalls).toBe(0);
  });

  test("x402 initialization failure returns a safe runtime error", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let handlerCalls = 0;
    const failingApp = createApp({
      x402Middleware: createX402Middleware(validX402Config, {
        createProtectedMiddleware: () => ({
          initialize: async () => {
            throw new Error(
              "Facilitator does not support exact on eip155:84532. Make sure to call initialize()."
            );
          },
          handler: async (c) => {
            handlerCalls += 1;
            return c.json({}, 402);
          }
        })
      })
    });

    const response = await failingApp.request("/v1/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "scam_check", input: "Send crypto today." })
    });
    const body = await response.json();

    infoSpy.mockRestore();
    warnSpy.mockRestore();
    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: {
        code: "X402_RUNTIME_ERROR",
        message:
          "x402 payment middleware failed before completing the payment challenge.",
        details: {
          hint: "Check x402 network, facilitator URL, and pay-to address configuration."
        }
      }
    });
    expect(handlerCalls).toBe(0);
    expectSafeError(body);
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
