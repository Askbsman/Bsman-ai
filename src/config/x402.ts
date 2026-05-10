export type X402Config = {
  enabled: boolean;
  network: `${string}:${string}`;
  payTo: string;
  facilitatorUrl: string;
  analyzePriceUsd: string;
  agentActionPriceUsd: string;
};

const networkAliases: Record<string, `${string}:${string}`> = {
  "base-sepolia": "eip155:84532",
  base: "eip155:8453"
};

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

export function readX402Config(): X402Config {
  const enabled = envValue("X402_ENABLED", "false").toLowerCase() === "true";

  return {
    enabled,
    network: normalizeX402Network(envValue("X402_NETWORK", "base-sepolia")),
    payTo: envValue("X402_PAY_TO"),
    facilitatorUrl: envValue("X402_FACILITATOR_URL", "https://facilitator.x402.org"),
    analyzePriceUsd: envValue("X402_PRICE_ANALYZE_USD", "0.001"),
    agentActionPriceUsd: envValue("X402_PRICE_AGENT_ACTION_USD", "0.005")
  };
}
