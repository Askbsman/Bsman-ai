import type { Context } from "hono";
import { Hono } from "hono";
import { analyze } from "../core/analyzer.js";
import { analyzeCapabilityResponse } from "../config/discovery.js";
import {
  analyzeRequestSchema,
  normalizeAnalyzeRequest
} from "../schemas/analyze-request.js";
import {
  demoLimitReachedError,
  unsupportedLanguageError,
  validationError
} from "../utils/api-error.js";

export const analyzeRoute = new Hono();
const demoLimit = 3;
const demoUsageByClient = new Map<string, number>();

function getClientKey(c: Context): string {
  const forwardedFor = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    c.req.header("cf-connecting-ip") ??
    forwardedFor ??
    c.req.header("x-real-ip") ??
    "local-demo-client"
  );
}

async function parseAnalyzeRequest(c: Context) {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return { response: validationError(c) };
  }

  const result = analyzeRequestSchema.safeParse(body);
  if (!result.success) {
    return { response: validationError(c, result.error.issues) };
  }

  const request = normalizeAnalyzeRequest(result.data);

  if (request.language !== undefined && request.language.toLowerCase() !== "en") {
    return { response: unsupportedLanguageError(c) };
  }

  return { request };
}

analyzeRoute.get("/analyze", (c) => c.json(analyzeCapabilityResponse));

analyzeRoute.get("/demo/analyze", (c) =>
  c.json({
    service: "Call BS Man API",
    endpoint: "POST /v1/demo/analyze",
    description:
      "Free demo endpoint for the BS Man Console. Send a POST request with the same body as /v1/analyze.",
    free_demo: {
      enabled: true,
      limit: demoLimit,
      scope: "per client IP while this server process is running"
    },
    console: "https://callbsman.com/app.html",
    paid_endpoint: "POST https://api.callbsman.com/v1/analyze"
  })
);

analyzeRoute.post("/analyze", async (c) => {
  const parsed = await parseAnalyzeRequest(c);
  if (parsed.response) {
    return parsed.response;
  }

  return c.json(analyze(parsed.request));
});

analyzeRoute.post("/demo/analyze", async (c) => {
  const parsed = await parseAnalyzeRequest(c);
  if (parsed.response) {
    return parsed.response;
  }

  const clientKey = getClientKey(c);
  const used = demoUsageByClient.get(clientKey) ?? 0;
  if (used >= demoLimit) {
    return demoLimitReachedError(c);
  }

  const nextUsed = used + 1;
  demoUsageByClient.set(clientKey, nextUsed);

  return c.json({
    ...analyze(parsed.request),
    demo: {
      free: true,
      limit: demoLimit,
      used: nextUsed,
      remaining: Math.max(demoLimit - nextUsed, 0)
    }
  });
});
