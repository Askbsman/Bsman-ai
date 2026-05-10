import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import type { Context, MiddlewareHandler } from "hono";
import type { X402Config, X402ConfigValidation } from "../config/x402.js";
import {
  isEvmAddress,
  readX402Config,
  validateX402Config
} from "../config/x402.js";
import { x402ConfigError, x402RuntimeError } from "../utils/api-error.js";

function noopMiddleware(): MiddlewareHandler {
  return async (_c, next) => {
    await next();
  };
}

function price(value: string): string {
  return value.startsWith("$") ? value : `$${value}`;
}

function isProtectedAnalyzeRoute(c: Context): boolean {
  return c.req.method === "POST" && c.req.path === "/v1/analyze";
}

function facilitatorHost(value: string): string | null {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

function safeErrorMessage(value: string): string {
  return value.replace(/https?:\/\/\S+/g, "[url]");
}

function logSafeDiagnostics(
  config: X402Config,
  validation: X402ConfigValidation,
  error?: unknown
) {
  const errorInfo =
    error instanceof Error
      ? { errorName: error.name, errorMessage: safeErrorMessage(error.message) }
      : error === undefined
        ? {}
        : { errorName: "UnknownError", errorMessage: safeErrorMessage(String(error)) };

  console.warn("[x402]", {
    enabled: config.enabled,
    network: config.network,
    payToPresent: config.payTo.length > 0,
    payToHas0xFormat: isEvmAddress(config.payTo),
    facilitatorUrlPresent: config.facilitatorUrl.length > 0,
    facilitatorHost: facilitatorHost(config.facilitatorUrl),
    missing: validation.missing,
    invalid: validation.invalid,
    ...errorInfo
  });
}

function createOfficialX402Middleware(config: X402Config): MiddlewareHandler {
  const network = config.network as `${string}:${string}`;
  const facilitatorClient = new HTTPFacilitatorClient({
    url: config.facilitatorUrl
  });
  const resourceServer = new x402ResourceServer(facilitatorClient).register(
    network,
    new ExactEvmScheme()
  );

  return paymentMiddleware(
    {
      "POST /v1/analyze": {
        accepts: {
          scheme: "exact",
          price: price(config.analyzePriceUsd),
          network,
          payTo: config.payTo,
          maxTimeoutSeconds: 60
        },
        description: "BS Man Risk API analyze request",
        mimeType: "application/json"
      }
    },
    resourceServer,
    undefined,
    undefined,
    false
  );
}

export function createX402Middleware(config: X402Config = readX402Config()): MiddlewareHandler {
  if (!config.enabled) {
    return noopMiddleware();
  }

  let protectedMiddleware: MiddlewareHandler | null = null;

  return async (c, next) => {
    if (!isProtectedAnalyzeRoute(c)) {
      await next();
      return;
    }

    const validation = validateX402Config(config);
    if (!validation.valid) {
      logSafeDiagnostics(config, validation);
      return x402ConfigError(c, validation);
    }

    try {
      protectedMiddleware ??= createOfficialX402Middleware(config);
      return await protectedMiddleware(c, next);
    } catch (error) {
      logSafeDiagnostics(config, validation, error);
      return x402RuntimeError(c);
    }
  };
}
