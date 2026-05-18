import { serve } from "@hono/node-server";
import { readFile } from "node:fs/promises";
import type { Context, MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { analyzeRoute } from "./routes/analyze.js";
import { createX402Middleware } from "./middleware/x402.js";
import type { X402Config } from "./config/x402.js";
import {
  openApiJsonDocument,
  serviceDiscoveryMetadata
} from "./config/service-discovery.js";
import { internalError } from "./utils/api-error.js";

type CreateAppOptions = {
  x402Config?: X402Config;
  x402Middleware?: MiddlewareHandler;
};

export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono();

  app.onError((_error, c) => internalError(c));

  app.use(
    "*",
    cors({
      origin: ["https://callbsman.com", "https://www.callbsman.com", "null"],
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "X-PAYMENT", "Authorization"],
      exposeHeaders: ["PAYMENT-REQUIRED"],
      maxAge: 86400
    })
  );

  app.use("*", options.x402Middleware ?? createX402Middleware(options.x402Config));

  app.get("/", (c) => c.json(serviceDiscoveryMetadata));

  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "bsman-risk-api",
      version: "0.1.0"
    })
  );

  const serveOpenApiYaml = async (c: Context) => {
    const openapi = await readFile("docs/openapi.yaml", "utf8");
    return c.text(openapi, 200, {
      "content-type": "text/yaml; charset=utf-8"
    });
  };
  const serveOpenApiJson = (c: Context) => c.json(openApiJsonDocument);

  app.get("/docs/openapi.yaml", serveOpenApiYaml);
  app.get("/openapi.yaml", serveOpenApiYaml);
  app.get("/docs/openapi.json", serveOpenApiJson);
  app.get("/openapi.json", serveOpenApiJson);

  app.route("/v1", analyzeRoute);

  return app;
}

const app = createApp();

const shouldListen = !process.env.VITEST;

if (shouldListen) {
  const port = Number(process.env.PORT ?? 3000);
  serve(
    {
      fetch: app.fetch,
      port
    },
    (info) => {
      console.log(`BS Man Risk API listening on http://localhost:${info.port}`);
    }
  );
}

export default app;
