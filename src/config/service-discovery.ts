import {
  analyzeCapabilityResponse,
  analyzeRequestExample,
  analyzeResponseExample,
  bazaarDiscoveryMetadata
} from "./discovery.js";
import { analyzeModes } from "../schemas/analyze-request.js";

const apiBaseUrl = "https://api.callbsman.com";
const analyzePath = "/v1/analyze";
const analyzeUrl = `${apiBaseUrl}${analyzePath}`;
const openApiJsonUrl = `${apiBaseUrl}/openapi.json`;
const openApiYamlUrl = `${apiBaseUrl}/openapi.yaml`;

const x402Accepts = [
  {
    scheme: "exact",
    network: "eip155:8453",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amount: "1000",
    payTo: "0x7642CCEd89398Bd638d9Ee2F82dA8cd3FC01ADA1",
    maxTimeoutSeconds: 60,
    mimeType: bazaarDiscoveryMetadata.mimeType,
    description: analyzeCapabilityResponse.description,
    extra: {
      name: "USD Coin",
      version: "2",
      bsman: {
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
    }
  }
] as const;

const bazaarAnalyzeExtension = {
  description: bazaarDiscoveryMetadata.description,
  category: bazaarDiscoveryMetadata.category,
  tags: [...bazaarDiscoveryMetadata.tags],
  provider: bazaarDiscoveryMetadata.provider,
  docsUrl: bazaarDiscoveryMetadata.docsUrl,
  openApiUrl: bazaarDiscoveryMetadata.openApiUrl,
  githubUrl: bazaarDiscoveryMetadata.githubUrl,
  bodyType: "json",
  input: analyzeRequestExample,
  inputSchema: bazaarDiscoveryMetadata.request.schema,
  output: {
    example: analyzeResponseExample,
    schema: bazaarDiscoveryMetadata.response.schema
  }
} as const;

const x402AnalyzeResource = {
  url: analyzeUrl,
  resource: analyzeUrl,
  type: "http",
  method: "POST",
  description: analyzeCapabilityResponse.description,
  mimeType: bazaarDiscoveryMetadata.mimeType,
  accepts: x402Accepts,
  extensions: {
    bazaar: bazaarAnalyzeExtension
  },
  metadata: {
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
} as const;

export const x402WellKnownManifest = {
  x402Version: 2,
  name: bazaarDiscoveryMetadata.name,
  description: bazaarDiscoveryMetadata.description,
  accepts: x402Accepts,
  resources: [
    x402AnalyzeResource,
    {
      ...x402AnalyzeResource,
      method: "GET",
      description: "Paid x402 discovery/capability probe for the analyze resource.",
      extensions: {
        bazaar: {
          description: "Paid x402 discovery/capability probe for the analyze resource.",
          output: {
            example: analyzeCapabilityResponse
          }
        }
      }
    }
  ],
  discovery: {
    name: bazaarDiscoveryMetadata.name,
    provider: bazaarDiscoveryMetadata.provider,
    category: bazaarDiscoveryMetadata.category,
    description: bazaarDiscoveryMetadata.description,
    docsUrl: bazaarDiscoveryMetadata.docsUrl,
    openApiUrl: bazaarDiscoveryMetadata.openApiUrl,
    githubUrl: bazaarDiscoveryMetadata.githubUrl,
    tags: [...bazaarDiscoveryMetadata.tags]
  }
} as const;

export const serviceDiscoveryMetadata = {
  name: "BS Man AI",
  service: "Call BS Man API",
  description: "Conversation Risk Intelligence API for AI agents.",
  version: "0.1.0",
  status: "live",
  docs: bazaarDiscoveryMetadata.docsUrl,
  openapi: openApiJsonUrl,
  openapi_json: openApiJsonUrl,
  openapi_yaml: openApiYamlUrl,
  github: bazaarDiscoveryMetadata.githubUrl,
  endpoints: {
    health: "/health",
    analyze: analyzePath,
    analyze_probe: analyzePath,
    openapi: "/openapi.json",
    openapi_json: "/openapi.json",
    openapi_yaml: "/openapi.yaml",
    docs_openapi_json: "/docs/openapi.json",
    docs_openapi_yaml: "/docs/openapi.yaml"
  },
  resources: [
    {
      name: "Call BS Man API Analyze",
      description: analyzeCapabilityResponse.description,
      category: bazaarDiscoveryMetadata.category,
      path: analyzePath,
      url: analyzeUrl,
      resource: analyzeUrl,
      methods: ["GET", "POST"],
      primary_method: "POST",
      paid_methods: ["GET", "POST"],
      mimeType: bazaarDiscoveryMetadata.mimeType,
      payment: {
        protocol: "x402",
        network: "Base mainnet",
        price: "$0.001 per analyze request",
        price_usd: 0.001,
        resource: analyzeUrl
      },
      primary_mode: bazaarDiscoveryMetadata.mainMode,
      supported_modes: [...bazaarDiscoveryMetadata.supportedModes],
      request: analyzeRequestExample,
      response: analyzeResponseExample,
      tags: [...bazaarDiscoveryMetadata.tags],
      docs: bazaarDiscoveryMetadata.docsUrl,
      openapi: openApiJsonUrl
    }
  ],
  sample_endpoints: [
    {
      name: "Analyze conversation risk",
      method: "POST",
      path: analyzePath,
      url: analyzeUrl,
      description: analyzeCapabilityResponse.description,
      payment: "x402",
      network: "Base mainnet",
      price: "$0.001",
      price_usd: 0.001,
      sample_request: analyzeRequestExample
    },
    {
      name: "Paid discovery capability probe",
      method: "GET",
      path: analyzePath,
      url: analyzeUrl,
      description: "Paid x402 discovery/capability probe for the analyze resource.",
      payment: "x402",
      network: "Base mainnet",
      price: "$0.001",
      price_usd: 0.001
    }
  ],
  health: `${apiBaseUrl}/health`
} as const;

const x402OpenApiMetadata = {
  payment: "x402",
  network: "Base mainnet",
  price: "$0.001",
  resource: analyzeUrl,
  mimeType: bazaarDiscoveryMetadata.mimeType,
  mainMode: bazaarDiscoveryMetadata.mainMode,
  supportedModes: [...bazaarDiscoveryMetadata.supportedModes],
  bazaarMetadata: "docs/bazaar-metadata.json"
} as const;

const agentCashPaymentInfo = {
  price: {
    mode: "fixed",
    currency: "USD",
    amount: "0.001000"
  },
  protocols: [
    {
      x402: {}
    }
  ]
} as const;

export const openApiJsonDocument = {
  openapi: "3.1.0",
  info: {
    title: "BS Man Risk API",
    version: "0.1.0",
    description: "Conversation Risk Intelligence API for AI agents.",
    "x-bazaar-metadata": {
      name: bazaarDiscoveryMetadata.name,
      provider: bazaarDiscoveryMetadata.provider,
      category: bazaarDiscoveryMetadata.category,
      resourceUrl: analyzeUrl,
      docsUrl: bazaarDiscoveryMetadata.docsUrl,
      githubUrl: bazaarDiscoveryMetadata.githubUrl,
      cdpIndexingLimitation: bazaarDiscoveryMetadata.cdpIndexingLimitation
    }
  },
  servers: [
    {
      url: apiBaseUrl,
      description: "Primary production API"
    },
    {
      url: "https://bsman-ai.onrender.com",
      description: "Render fallback endpoint"
    },
    {
      url: "http://localhost:3000",
      description: "Local development"
    }
  ],
  paths: {
    "/": {
      get: {
        summary: "Service metadata and resource discovery",
        operationId: "getServiceMetadata",
        responses: {
          "200": {
            description: "Public service metadata and paid resource list."
          }
        }
      }
    },
    "/health": {
      get: {
        summary: "Health check",
        operationId: "getHealth",
        responses: {
          "200": {
            description: "Service health status."
          }
        }
      }
    },
    "/openapi.json": {
      get: {
        summary: "OpenAPI JSON",
        operationId: "getOpenApiJson",
        responses: {
          "200": {
            description: "OpenAPI document in JSON format."
          }
        }
      }
    },
    "/openapi.yaml": {
      get: {
        summary: "OpenAPI YAML",
        operationId: "getOpenApiYamlAlias",
        responses: {
          "200": {
            description: "OpenAPI document in YAML format."
          }
        }
      }
    },
    "/docs/openapi.json": {
      get: {
        summary: "OpenAPI JSON",
        operationId: "getDocsOpenApiJson",
        responses: {
          "200": {
            description: "OpenAPI document in JSON format."
          }
        }
      }
    },
    "/docs/openapi.yaml": {
      get: {
        summary: "OpenAPI YAML",
        operationId: "getDocsOpenApiYaml",
        responses: {
          "200": {
            description: "OpenAPI document in YAML format."
          }
        }
      }
    },
    "/v1/analyze": {
      get: {
        summary: "Paid x402 discovery/capability probe",
        operationId: "getAnalyzeCapability",
        "x-x402": x402OpenApiMetadata,
        "x-payment-info": agentCashPaymentInfo,
        responses: {
          "200": {
            description: "Capability JSON after verified x402 payment."
          },
          "402": {
            description: "Payment Required"
          }
        }
      },
      post: {
        summary: "Analyze communication risk signals",
        operationId: "analyzeConversationRisk",
        "x-x402": x402OpenApiMetadata,
        "x-payment-info": agentCashPaymentInfo,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AnalyzeRequest"
              },
              examples: {
                agentActionCheck: {
                  value: analyzeRequestExample
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Structured conversation risk analysis."
          },
          "400": {
            description: "Invalid request body."
          },
          "402": {
            description: "Payment Required"
          }
        }
      }
    }
  },
  components: {
    schemas: {
      ServiceMetadata: {
        type: "object"
      },
      HealthResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean", const: true },
          service: { type: "string", const: "bsman-risk-api" },
          version: { type: "string" }
        }
      },
      AnalyzeRequest: {
        type: "object",
        required: ["mode"],
        properties: {
          mode: {
            type: "string",
            enum: analyzeModes
          },
          input: {
            oneOf: [{ type: "string" }, { type: "object" }]
          },
          context: {
            type: "object",
            additionalProperties: true
          },
          language: {
            type: "string",
            const: "en"
          },
          locale: {
            type: "string"
          }
        },
        additionalProperties: true
      },
      AnalyzeResponse: {
        type: "object"
      },
      ErrorResponse: {
        type: "object"
      }
    }
  }
} as const;
