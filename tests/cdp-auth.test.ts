import { generateKeyPairSync } from "node:crypto";
import { decodeJwt } from "jose";
import { describe, expect, test } from "vitest";
import {
  createCdpFacilitatorAuthHeaders,
  createCdpJwt
} from "../src/utils/cdp-auth.js";

function createTestCdpSecret(): string {
  const { privateKey } = generateKeyPairSync("ed25519");
  const jwk = privateKey.export({ format: "jwk" });
  const seed = Buffer.from(jwk.d!, "base64url");
  const publicKey = Buffer.from(jwk.x!, "base64url");

  return Buffer.concat([seed, publicKey]).toString("base64");
}

describe("CDP facilitator auth", () => {
  test("creates CDP JWTs scoped to facilitator operations", async () => {
    const jwt = await createCdpJwt(
      {
        facilitatorUrl: "https://api.cdp.coinbase.com/platform/v2/x402",
        apiKeyId: "test-key-id",
        apiKeySecret: createTestCdpSecret()
      },
      "verify"
    );
    const payload = decodeJwt(jwt);

    expect(payload).toMatchObject({
      sub: "test-key-id",
      iss: "cdp",
      aud: ["cdp_service"],
      uri: "POST api.cdp.coinbase.com/platform/v2/x402/verify",
      uris: ["POST api.cdp.coinbase.com/platform/v2/x402/verify"]
    });
  });

  test("creates bearer headers for supported, verify, and settle", async () => {
    const headers = await createCdpFacilitatorAuthHeaders({
      facilitatorUrl: "https://api.cdp.coinbase.com/platform/v2/x402",
      apiKeyId: "test-key-id",
      apiKeySecret: createTestCdpSecret()
    });

    expect(headers.supported.Authorization).toMatch(/^Bearer /);
    expect(headers.verify.Authorization).toMatch(/^Bearer /);
    expect(headers.settle.Authorization).toMatch(/^Bearer /);
  });
});
