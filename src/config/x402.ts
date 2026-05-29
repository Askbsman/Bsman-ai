export type X402FacilitatorProvider = "http" | "cdp";

export type X402Config = {
  enabled: boolean;
  network: string;
  payTo: string;
  facilitatorUrl: string;
  facilitatorProvider?: X402FacilitatorProvider;
  cdpApiKeyId?: string;
  cdpApiKeySecret?: string;
  analyzePriceUsd: string;
  agentActionPriceUsd: string;
};

export type X402ConfigValidation = {
  valid: boolean;
  missing: string[];
  invalid: string[];
};

const networkAliases: Record<string, string> = {
  "base-sepolia": "eip155:84532",
  base: "eip155:8453"
};

const facilitatorProviders = new Set<X402FacilitatorProvider>(["http", "cdp"]);

function envValue(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

export function normalizeX402Network(value: string): `${string}:${string}` {
  const network = networkAliases[value] ?? value;
  if (!network.includes(":")) {
    throw new Error("X402_NETWORK must be a CAIP-2 network identifier or supported alias.");
  }
  return network as `${string}:${string}`;
}

function isPositivePrice(value: string): boolean {
  const parsed = Number(value.replace(/^\$/, ""));
  return Number.isFinite(parsed) && parsed > 0;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function isEvmAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function validateX402Config(config: X402Config): X402ConfigValidation {
  const missing: string[] = [];
  const invalid: string[] = [];
  const facilitatorProvider = config.facilitatorProvider ?? "http";

  if (typeof config.enabled !== "boolean") {
    invalid.push("X402_ENABLED");
  }

  if (!config.enabled) {
    return {
      valid: missing.length === 0 && invalid.length === 0,
      missing,
      invalid
    };
  }

  if (!config.network) {
    missing.push("X402_NETWORK");
  } else if (!config.network.includes(":")) {
    invalid.push("X402_NETWORK");
  }

  if (!config.payTo) {
    missing.push("X402_PAY_TO");
  } else if (!isEvmAddress(config.payTo)) {
    invalid.push("X402_PAY_TO");
  }

  if (!config.facilitatorUrl) {
    missing.push("X402_FACILITATOR_URL");
  } else if (!isValidUrl(config.facilitatorUrl)) {
    invalid.push("X402_FACILITATOR_URL");
  }

  if (!facilitatorProviders.has(facilitatorProvider)) {
    invalid.push("X402_FACILITATOR_PROVIDER");
  }

  if (facilitatorProvider === "cdp") {
    if (!config.cdpApiKeyId) {
      missing.push("CDP_API_KEY_ID");
    }

    if (!config.cdpApiKeySecret) {
      missing.push("CDP_API_KEY_SECRET");
    }
  }

  if (!config.analyzePriceUsd) {
    missing.push("X402_PRICE_ANALYZE_USD");
  } else if (!isPositivePrice(config.analyzePriceUsd)) {
    invalid.push("X402_PRICE_ANALYZE_USD");
  }

  if (!config.agentActionPriceUsd) {
    missing.push("X402_PRICE_AGENT_ACTION_USD");
  } else if (!isPositivePrice(config.agentActionPriceUsd)) {
    invalid.push("X402_PRICE_AGENT_ACTION_USD");
  }

  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid
  };
}

export function readX402Config(): X402Config {
  const enabled = envValue("X402_ENABLED", "false").toLowerCase() === "true";
  const network = envValue("X402_NETWORK", enabled ? "" : "base-sepolia");
  const facilitatorProvider = envValue("X402_FACILITATOR_PROVIDER", "http").toLowerCase();

  return {
    enabled,
    network: networkAliases[network] ?? network,
    payTo: envValue("X402_PAY_TO"),
    facilitatorUrl: envValue("X402_FACILITATOR_URL"),
    facilitatorProvider: facilitatorProvider as X402FacilitatorProvider,
    cdpApiKeyId: envValue("CDP_API_KEY_ID"),
    cdpApiKeySecret: envValue("CDP_API_KEY_SECRET"),
    analyzePriceUsd: envValue("X402_PRICE_ANALYZE_USD", "0.001"),
    agentActionPriceUsd: envValue("X402_PRICE_AGENT_ACTION_USD", "0.005")
  };
}
