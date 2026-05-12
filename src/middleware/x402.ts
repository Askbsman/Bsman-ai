import {
  HTTPFacilitatorClient,
  type HTTPRequestContext,
  type HTTPResponseBody
} from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { bazaarResourceServerExtension } from "@x402/extensions";
import {
  paymentMiddlewareFromHTTPServer,
  x402HTTPResourceServer,
  x402ResourceServer
} from "@x402/hono";
import type { Context, MiddlewareHandler } from "hono";
import {
  bazaarDiscoveryMetadata,
  createBazaarAnalyzeDiscoveryExtensions,
  createBazaarCapabilityDiscoveryExtensions
} from "../config/discovery.js";
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

export function createX402PaymentRequiredBody(
  config: X402Config,
  context: Pick<HTTPRequestContext, "method" | "path">
): Promise<Record<string, unknown>> {
  const requestMethod = context.method.toUpperCase();
  const publicPrice = price(config.analyzePriceUsd);
  const resource = {
    url: bazaarDiscoveryMetadata.resourceUrl,
    description:
      "Conversation Risk Intelligence API for AI agents. Call BS Man API analyzes chats, offers, and proposed agent actions for scam signals, manipulation tactics, unsafe payment requests, wallet/payment risk, and risky next steps.",
    mimeType: bazaarDiscoveryMetadata.mimeType
  };

  return buildAnalyzePaymentRequirements(config).then((accepts) => ({
    x402Version: 2,
    error: "Payment required",
    resource,
    accepts,
    extensions:
      requestMethod === "GET"
        ? createBazaarCapabilityDiscoveryExtensions()
        : createBazaarAnalyzeDiscoveryExtensions(),
    compatibility: {
      paymentRequiredHeader: "PAYMENT-REQUIRED",
      headerIsCanonical: true,
      hint:
        "The PAYMENT-REQUIRED header is canonical. This JSON body mirrors the same PaymentRequired payload for clients that read the body."
    },
    resourceUrl: bazaarDiscoveryMetadata.resourceUrl,
    method: requestMethod,
    endpoint: `${requestMethod} ${bazaarDiscoveryMetadata.resourceUrl}`,
    payment: {
      protocol: bazaarDiscoveryMetadata.payment.protocol,
      network: bazaarDiscoveryMetadata.payment.network,
      networkId: config.network,
      price: `${publicPrice} ${bazaarDiscoveryMetadata.payment.unit}`,
      facilitator: "configured x402 facilitator"
    },
    metadata: {
      name: bazaarDiscoveryMetadata.name,
      provider: bazaarDiscoveryMetadata.provider,
      category: bazaarDiscoveryMetadata.category,
      description: "Conversation Risk Intelligence API for AI agents.",
      mimeType: bazaarDiscoveryMetadata.mimeType,
      docsUrl: bazaarDiscoveryMetadata.docsUrl,
      openApiUrl: bazaarDiscoveryMetadata.openApiUrl,
      githubUrl: bazaarDiscoveryMetadata.githubUrl,
      mainMode: bazaarDiscoveryMetadata.mainMode,
      supportedModes: [...bazaarDiscoveryMetadata.supportedModes],
      tags: [...bazaarDiscoveryMetadata.tags],
      fallbackUrl: bazaarDiscoveryMetadata.fallbackUrl
    }
  }));
}

type AnalyzePaymentOption = {
  scheme: "exact";
  price: string;
  network: `${string}:${string}`;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: Record<string, unknown>;
};

function createAnalyzePaymentOption(config: X402Config): AnalyzePaymentOption {
  return {
    scheme: "exact",
    price: price(config.analyzePriceUsd),
    network: config.network as `${string}:${string}`,
    payTo: config.payTo,
    maxTimeoutSeconds: 60,
    extra: {
      name: bazaarDiscoveryMetadata.name,
      provider: bazaarDiscoveryMetadata.provider,
      category: bazaarDiscoveryMetadata.category,
      tags: [...bazaarDiscoveryMetadata.tags],
      docsUrl: bazaarDiscoveryMetadata.docsUrl,
      openApiUrl: bazaarDiscoveryMetadata.openApiUrl,
      githubUrl: bazaarDiscoveryMetadata.githubUrl,
      mainMode: bazaarDiscoveryMetadata.mainMode,
      supportedModes: [...bazaarDiscoveryMetadata.supportedModes],
      fallbackUrl: bazaarDiscoveryMetadata.fallbackUrl
    }
  };
}

async function buildAnalyzePaymentRequirements(config: X402Config) {
  const option = createAnalyzePaymentOption(config);
  const parsedPrice = await new ExactEvmScheme().parsePrice(
    option.price,
    option.network
  );

  return [
    {
      scheme: option.scheme,
      network: option.network,
      amount: parsedPrice.amount,
      asset: parsedPrice.asset,
      payTo: option.payTo,
      maxTimeoutSeconds: option.maxTimeoutSeconds ?? 300,
      extra: {
        ...parsedPrice.extra,
        ...option.extra
      }
    }
  ];
}

function createUnpaidResponseBody(config: X402Config) {
  return async (context: HTTPRequestContext): Promise<HTTPResponseBody> => ({
    contentType: "application/json",
    body: await createX402PaymentRequiredBody(config, context)
  });
}

type ProtectedPaymentMiddleware = {
  handler: MiddlewareHandler;
  initialize: () => Promise<void>;
};

export type X402MiddlewareDependencies = {
  createProtectedMiddleware?: (config: X402Config) => ProtectedPaymentMiddleware;
};

function isProtectedAnalyzeRoute(c: Context): boolean {
  return (
    (c.req.method === "POST" || c.req.method === "GET") &&
    c.req.path === "/v1/analyze"
  );
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

export function createX402AnalyzeRoutes(config: X402Config) {
  const createAccepts = () => createAnalyzePaymentOption(config);
  const baseRoute = {
    resource: bazaarDiscoveryMetadata.resourceUrl,
    description:
      "Conversation Risk Intelligence API for AI agents. Call BS Man API analyzes chats, offers, and proposed agent actions for scam signals, manipulation tactics, unsafe payment requests, wallet/payment risk, and risky next steps.",
    mimeType: bazaarDiscoveryMetadata.mimeType,
    unpaidResponseBody: createUnpaidResponseBody(config)
  };

  return {
    "POST /v1/analyze": {
      ...baseRoute,
      accepts: createAccepts(),
      extensions: {
        ...createBazaarAnalyzeDiscoveryExtensions()
      }
    },
    "GET /v1/analyze": {
      ...baseRoute,
      accepts: createAccepts(),
      extensions: {
        ...createBazaarCapabilityDiscoveryExtensions()
      }
    }
  };
}

function createOfficialProtectedMiddleware(config: X402Config): ProtectedPaymentMiddleware {
  const network = config.network as `${string}:${string}`;
  const facilitatorClient = new HTTPFacilitatorClient({
    url: config.facilitatorUrl
  });
  const resourceServer = new x402ResourceServer(facilitatorClient)
    .register(network, new ExactEvmScheme())
    .registerExtension(bazaarResourceServerExtension);
  const httpServer = new x402HTTPResourceServer(
    resourceServer,
    createX402AnalyzeRoutes(config)
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
