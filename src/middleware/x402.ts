import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import type { MiddlewareHandler } from "hono";
import type { X402Config } from "../config/x402.js";
import { readX402Config } from "../config/x402.js";

function noopMiddleware(): MiddlewareHandler {
  return async (_c, next) => {
    await next();
  };
}

function price(value: string): string {
  return value.startsWith("$") ? value : `$${value}`;
}

export function createX402Middleware(config: X402Config = readX402Config()): MiddlewareHandler {
  if (!config.enabled) {
    return noopMiddleware();
  }

  if (!config.payTo) {
    throw new Error("X402_PAY_TO is required when X402_ENABLED=true.");
  }

  const facilitatorClient = new HTTPFacilitatorClient({
    url: config.facilitatorUrl
  });
  const resourceServer = new x402ResourceServer(facilitatorClient).register(
    config.network,
    new ExactEvmScheme()
  );

  return paymentMiddleware(
    {
      "POST /v1/analyze": {
        accepts: {
          scheme: "exact",
          price: price(config.analyzePriceUsd),
          network: config.network,
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
