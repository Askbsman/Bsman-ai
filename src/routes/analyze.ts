import { Hono } from "hono";
import { analyze } from "../core/analyzer.js";
import { analyzeRequestSchema } from "../schemas/analyze-request.js";
import { unsupportedLanguageError, validationError } from "../utils/api-error.js";

export const analyzeRoute = new Hono();

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

  if (result.data.language !== undefined && result.data.language.toLowerCase() !== "en") {
    return unsupportedLanguageError(c);
  }

  return c.json(analyze(result.data));
});
