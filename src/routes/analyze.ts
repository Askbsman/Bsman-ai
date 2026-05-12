import { Hono } from "hono";
import { analyze } from "../core/analyzer.js";
import { analyzeCapabilityResponse } from "../config/discovery.js";
import {
  analyzeRequestSchema,
  normalizeAnalyzeRequest
} from "../schemas/analyze-request.js";
import { unsupportedLanguageError, validationError } from "../utils/api-error.js";

export const analyzeRoute = new Hono();

analyzeRoute.get("/analyze", (c) => c.json(analyzeCapabilityResponse));

analyzeRoute.post("/analyze", async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return validationError(c);
  }

  const result = analyzeRequestSchema.safeParse(body);
  if (!result.success) {
    return validationError(c, result.error.issues);
  }

  const request = normalizeAnalyzeRequest(result.data);

  if (request.language !== undefined && request.language.toLowerCase() !== "en") {
    return unsupportedLanguageError(c);
  }

  return c.json(analyze(request));
});
