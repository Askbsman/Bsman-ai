import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import {
  paymentMiddlewareFromHTTPServer,
  x402HTTPResourceServer,
  x402ResourceServer
} from "@x402/hono";
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

type ProtectedPaymentMiddleware = {
  handler: MiddlewareHandler;
  initialize: () => Promise<void>;
};

export type X402MiddlewareDependencies = {
  createProtectedMiddleware?: (config: X402Config) => ProtectedPaymentMiddleware;
};

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

function logInitialization(
  status: "started" | "succeeded" | "failed",
  config: X402Config,
  error?: unknown
) {
  const errorInfo =
    error instanceof Error
      ? { errorName: error.name, errorMessage: safeErrorMessage(error.message) }
      : error === undefined
        ? {}
        : { errorName: "UnknownError", errorMessage: safeErrorMessage(String(error)) };

  const log = status === "failed" ? console.warn : console.info;
  log("[x402:init]", {
    status,
    enabled: config.enabled,
    network: config.network,
    payToPresent: config.payTo.length > 0,
    payToHas0xFormat: isEvmAddress(config.payTo),
    facilitatorUrlPresent: config.facilitatorUrl.length > 0,
    facilitatorHost: facilitatorHost(config.facilitatorUrl),
    ...errorInfo
  });
}

function createRoutes(config: X402Config) {
  return {
    "POST /v1/analyze": {
      accepts: {
        scheme: "exact",
        price: price(config.analyzePriceUsd),
        network: config.network as `${string}:${string}`,
        payTo: config.payTo,
        maxTimeoutSeconds: 60
      },
      description: "BS Man Risk API analyze request",
      mimeType: "application/json"
    }
  };
}

function createOfficialProtectedMiddleware(config: X402Config): ProtectedPaymentMiddleware {
  const network = config.network as `${string}:${string}`;
  const facilitatorClient = new HTTPFacilitatorClient({
    url: config.facilitatorUrl
  });
  const resourceServer = new x402ResourceServer(facilitatorClient).register(
    network,
    new ExactEvmScheme()
  );
  const httpServer = new x402HTTPResourceServer(
    resourceServer,
    createRoutes(config)
  );

  return {
    handler: paymentMiddlewareFromHTTPServer(
      httpServer,
      undefined,
      undefined,
      false
    ),
    initialize: () => httpServer.initialize()
  };
}

export function createX402Middleware(
  config: X402Config = readX402Config(),
  dependencies: X402MiddlewareDependencies = {}
): MiddlewareHandler {
  if (!config.enabled) {
    return noopMiddleware();
  }

  const createProtectedMiddleware =
    dependencies.createProtectedMiddleware ?? createOfficialProtectedMiddleware;
  let protectedMiddleware: ProtectedPaymentMiddleware | null = null;
  let initializePromise: Promise<void> | null = null;
  let initialized = false;

  async function ensureInitialized() {
    if (initialized) {
      return;
    }

    protectedMiddleware ??= createProtectedMiddleware(config);

    if (!initializePromise) {
      logInitialization("started", config);
      initializePromise = protectedMiddleware
        .initialize()
        .then(() => {
          initialized = true;
          logInitialization("succeeded", config);
        })
        .catch((error) => {
          initializePromise = null;
          logInitialization("failed", config, error);
          throw error;
        });
    }

    await initializePromise;
  }

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
      await ensureInitialized();
      return await protectedMiddleware!.handler(c, next);
    } catch (error) {
      logSafeDiagnostics(config, validation, error);
      return x402RuntimeError(c);
    }
  };
}
