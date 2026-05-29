import { createPrivateKey, randomBytes } from "node:crypto";
import { SignJWT, importJWK } from "jose";
import type { JWK } from "jose";

export type CdpFacilitatorOperation = "supported" | "verify" | "settle";

export type CdpFacilitatorAuthConfig = {
  facilitatorUrl: string;
  apiKeyId: string;
  apiKeySecret: string;
};

const operationMethods: Record<CdpFacilitatorOperation, "GET" | "POST"> = {
  supported: "GET",
  verify: "POST",
  settle: "POST"
};

const ed25519Pkcs8Prefix = Buffer.from(
  "302e020100300506032b657004220420",
  "hex"
);

function normalizeSecret(value: string): string {
  return value.replace(/\\n/g, "\n").trim();
}

async function importCdpPrivateKey(secret: string) {
  const normalized = normalizeSecret(secret);

  if (normalized.startsWith("{")) {
    const jwk = JSON.parse(normalized) as JWK;
    const algorithm = jwk.alg ?? (jwk.crv === "Ed25519" ? "EdDSA" : "ES256");
    return {
      algorithm,
      key: await importJWK(jwk, algorithm)
    };
  }

  if (normalized.includes("BEGIN")) {
    const key = createPrivateKey(normalized);
    return {
      algorithm: key.asymmetricKeyType === "ed25519" ? "EdDSA" : "ES256",
      key
    };
  }

  const rawKey = Buffer.from(normalized, "base64");
  if (rawKey.length === 32 || rawKey.length === 64) {
    const seed = rawKey.subarray(0, 32);
    return {
      algorithm: "EdDSA",
      key: createPrivateKey({
        key: Buffer.concat([ed25519Pkcs8Prefix, seed]),
        format: "der",
        type: "pkcs8"
      })
    };
  }

  throw new Error("Unsupported CDP API key secret format.");
}

function cdpRequestUri(
  facilitatorUrl: string,
  operation: CdpFacilitatorOperation
): string {
  const base = facilitatorUrl.replace(/\/+$/, "");
  const url = new URL(`${base}/${operation}`);
  return `${operationMethods[operation]} ${url.host}${url.pathname}`;
}

export async function createCdpJwt(
  config: CdpFacilitatorAuthConfig,
  operation: CdpFacilitatorOperation
): Promise<string> {
  const { algorithm, key } = await importCdpPrivateKey(config.apiKeySecret);
  const now = Math.floor(Date.now() / 1000);
  const uri = cdpRequestUri(config.facilitatorUrl, operation);

  return await new SignJWT({
    sub: config.apiKeyId,
    iss: "cdp",
    aud: ["cdp_service"],
    nbf: now,
    exp: now + 120,
    uri,
    uris: [uri]
  })
    .setProtectedHeader({
      alg: algorithm,
      kid: config.apiKeyId,
      nonce: randomBytes(16).toString("hex"),
      typ: "JWT"
    })
    .sign(key);
}

export async function createCdpFacilitatorAuthHeaders(
  config: CdpFacilitatorAuthConfig
): Promise<Record<CdpFacilitatorOperation, Record<string, string>>> {
  const supportedJwt = await createCdpJwt(config, "supported");
  const verifyJwt = await createCdpJwt(config, "verify");
  const settleJwt = await createCdpJwt(config, "settle");

  return {
    supported: {
      Authorization: `Bearer ${supportedJwt}`
    },
    verify: {
      Authorization: `Bearer ${verifyJwt}`
    },
    settle: {
      Authorization: `Bearer ${settleJwt}`
    }
  };
}
