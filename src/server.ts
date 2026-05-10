import { serve } from "@hono/node-server";
import { readFile } from "node:fs/promises";
import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { analyzeRoute } from "./routes/analyze.js";
import { createX402Middleware } from "./middleware/x402.js";
import type { X402Config } from "./config/x402.js";
import { internalError } from "./utils/api-error.js";

type CreateAppOptions = {
  x402Config?: X402Config;
  x402Middleware?: MiddlewareHandler;
};

export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono();

  app.onError((_error, c) => internalError(c));

  app.use("*", options.x402Middleware ?? createX402Middleware(options.x402Config));

  app.get("/", (c) =>
    c.json({
      name: "BS Man AI",
      description: "Conversation Risk Intelligence API for AI agents.",
      version: "0.1.0",
      endpoints: {
        health: "/health",
        analyze: "/v1/analyze",
        openapi: "/docs/openapi.yaml"
      }
    })
  );

  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "bsman-risk-api",
      version: "0.1.0"
    })
  );

  app.get("/docs/openapi.yaml", async (c) => {
    const openapi = await readFile("docs/openapi.yaml", "utf8");
    return c.text(openapi, 200, {
      "content-type": "text/yaml; charset=utf-8"
    });
  });

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
