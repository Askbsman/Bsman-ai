import type { Context } from "hono";

type ErrorDetails = unknown[] | Record<string, unknown>;

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNSUPPORTED_LANGUAGE"
  | "INTERNAL_ERROR";

export function apiError(
  code: ApiErrorCode,
  message: string,
  details: ErrorDetails = []
) {
  return {
    error: {
      code,
      message,
      details
    }
  };
}

export function validationError(c: Context, details: ErrorDetails = []) {
  return c.json(apiError("VALIDATION_ERROR", "Invalid request body.", details), 400);
}

export function unsupportedLanguageError(c: Context) {
  return c.json(
    apiError("UNSUPPORTED_LANGUAGE", "BS Man AI v0.1 supports English only.", {
      supported_languages: ["en"]
    }),
    400
  );
}

export function internalError(c: Context) {
  return c.json(apiError("INTERNAL_ERROR", "Internal server error.", []), 500);
}
