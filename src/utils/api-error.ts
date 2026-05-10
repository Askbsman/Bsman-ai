import type { Context } from "hono";

type ErrorDetails = unknown[] | Record<string, unknown>;

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNSUPPORTED_LANGUAGE"
  | "X402_CONFIG_ERROR"
  | "X402_RUNTIME_ERROR"
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

export function x402ConfigError(
  c: Context,
  details: { missing: string[]; invalid: string[] }
) {
  return c.json(
    apiError(
      "X402_CONFIG_ERROR",
      "x402 is enabled but payment configuration is invalid.",
      {
        missing: details.missing,
        invalid: details.invalid
      }
    ),
    500
  );
}

export function x402RuntimeError(c: Context) {
  return c.json(
    apiError(
      "X402_RUNTIME_ERROR",
      "x402 payment middleware failed before completing the payment challenge.",
      {
        hint: "Check x402 network, facilitator URL, and pay-to address configuration."
      }
    ),
    500
  );
}
