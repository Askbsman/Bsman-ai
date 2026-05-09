# x402 Implementation Plan

Status: research plan only. x402 payment enforcement is not implemented in BS Man AI yet.

Research date: 2026-05-10

Primary sources:

- x402 docs: https://docs.x402.org/
- x402 Express/Hono middleware docs: https://docs.x402.org/packages/x402-hono
- x402 facilitator docs: https://docs.x402.org/core-concepts/facilitator
- Coinbase CDP x402 quickstart: https://docs.cdp.coinbase.com/x402/get-started/quickstart-for-sellers
- x402 GitHub repository: https://github.com/coinbase/x402
- npm `@x402/hono`: https://www.npmjs.com/package/@x402/hono
- npm `@x402/core`: https://www.npmjs.com/package/@x402/core

## 1. Current x402 Flow

The expected HTTP flow for a paid endpoint is:

1. A client requests a paid endpoint without a payment.
2. The server returns `402 Payment Required` with machine-readable payment requirements.
3. The client pays using an x402-compatible wallet or client.
4. The client retries the request with payment proof in the x402 payment header.
5. The server verifies the payment directly or through a facilitator.
6. The server returns the normal API response.

For BS Man AI, the normal response after successful payment should remain the existing `POST /v1/analyze` JSON contract. x402 should wrap access to the endpoint, not change the analysis response body.

## 2. BS Man AI Endpoint Policy

Free endpoints:

- `GET /`
- `GET /health`
- `GET /docs/openapi.yaml`

Paid endpoint:

- `POST /v1/analyze`

Future paid endpoint:

- `POST /v1/agent-action-check`, if added later

Discovery, health, and OpenAPI endpoints should stay free so agents can inspect the service, decide whether they can pay, and monitor availability without spending money.

## 3. Package Plan

Recommended packages to inspect and install during Stage 0.6:

- `@x402/hono`: Hono middleware for protecting routes with x402 payment requirements.
- `@x402/core`: shared x402 types and core protocol helpers.
- `@x402/evm`: EVM-related payment support for networks such as Base Sepolia and Base mainnet.

Likely testing/client packages:

- `x402-fetch` or the current official client package recommended by x402 docs for retrying requests with payment proof.
- CDP wallet/client tooling if using the Coinbase CDP buyer flow in integration tests.

Do not install these packages in Stage 0.5. Stage 0.6 should install only the exact packages needed after confirming the current API from official docs and package versions.

## 4. Environment Variables

Proposed `.env` keys:

```bash
X402_ENABLED=false
X402_NETWORK=base-sepolia
X402_PAY_TO=
X402_FACILITATOR_URL=
X402_API_KEY=
X402_PRICE_ANALYZE_USD=0.001
X402_PRICE_ANALYZE_DEEP_USD=0.005
```

Testnet-oriented keys:

- `X402_ENABLED`: should default to `false`. Set to `true` only when testing payment protection.
- `X402_NETWORK`: use `base-sepolia` for testnet validation.
- `X402_PAY_TO`: receiving wallet address for testnet payments.
- `X402_FACILITATOR_URL`: testnet facilitator URL, such as the x402.org testnet facilitator if still supported by current docs.
- `X402_PRICE_ANALYZE_USD`: initial deterministic analyze price.
- `X402_PRICE_ANALYZE_DEEP_USD`: future deep analyze price.

Production-only or production-sensitive keys:

- `X402_PAY_TO`: production receiving wallet address.
- `X402_NETWORK`: likely `base` or the current official Base mainnet network identifier.
- `X402_FACILITATOR_URL`: production facilitator URL.
- `X402_API_KEY`: required only if the chosen facilitator requires API authentication, such as a CDP facilitator setup.

No private keys should be added to `.env.example`, committed to the repository, or logged at runtime.

## 5. Facilitator Options

### CDP Facilitator

Coinbase CDP provides x402 seller documentation and is the most likely production-oriented path for a public MVP. Use this option if BS Man AI wants a supported facilitator flow with Coinbase/CDP tooling.

Planning notes:

- Confirm the current CDP facilitator URL and authentication requirements before implementation.
- Treat CDP API keys as production secrets.
- Keep payment verification errors generic to avoid leaking facilitator details.

### x402.org Testnet Facilitator

x402 docs describe a facilitator service model, and public examples commonly use a testnet facilitator URL for development. If the current docs still support `https://x402.org/facilitator`, use it for early Base Sepolia validation.

Planning notes:

- Testnet facilitator behavior may differ from production reliability and limits.
- Use it only for development and integration validation.
- Reconfirm current availability before Stage 0.6 implementation.

### Testnet vs Mainnet

Use Base Sepolia first:

- safer for implementation testing
- no production funds at risk
- lets us verify 402 challenge, payment retry, and successful analysis response

Move to Base mainnet only after:

- `X402_ENABLED=false` mode is verified
- testnet payment flow works end to end
- logs are checked for secret/signature leakage
- deployment environment is configured with production secrets

## 6. Pricing Recommendation

Initial BS Man AI pricing:

- Fast deterministic analyze: `$0.001` per `POST /v1/analyze`
- Future deep analyze: `$0.005` per request
- Future `agent_action_check`: `$0.005` to `$0.01` per request

Why `POST /v1/analyze` should be paid:

- It is the core value-producing endpoint.
- It performs the risk analysis and returns structured patterns, confidence, evidence, actions, and optional safe reply.
- It is the endpoint agents will call in a decision workflow.

Why docs and health should stay free:

- Agents need free discovery before payment.
- Health checks should not create billing noise.
- OpenAPI access helps client generation and marketplace review.

## 7. Implementation Design

Place x402 middleware around `POST /v1/analyze` only.

Current structure:

- `src/server.ts` wires service-level routes and mounts `analyzeRoute` at `/v1`.
- `src/routes/analyze.ts` owns `POST /analyze`.

Recommended Stage 0.6 design:

1. Add `src/config/x402.ts` for environment parsing.
2. Add `src/middleware/x402.ts` for optional payment middleware creation.
3. In `src/routes/analyze.ts`, apply x402 middleware only to `POST /analyze` when `X402_ENABLED=true`.
4. Leave `GET /`, `GET /health`, and `GET /docs/openapi.yaml` outside the middleware.

Requirements:

- Keep free endpoints unprotected.
- Protect only `POST /v1/analyze`.
- Preserve the current JSON response format after successful payment.
- Return a standards-compliant `402 Payment Required` response before payment.
- Keep x402 disabled by default unless `X402_ENABLED=true`.
- Avoid changing deterministic analysis behavior when payment is disabled.

Pseudo-shape:

```ts
const maybeX402 = createX402Middleware(x402Config);

analyzeRoute.post(
  "/analyze",
  maybeX402,
  analyzeHandler
);
```

If `X402_ENABLED=false`, `maybeX402` should be a no-op middleware.

## 8. Testing Strategy

Automated tests:

- Current tests must still pass with `X402_ENABLED=false`.
- Add tests that payment-disabled mode behaves exactly like the current API.
- Add tests that `GET /health` remains free.
- Add tests that `GET /` remains free.
- Add tests that `GET /docs/openapi.yaml` remains free.
- Add tests that `POST /v1/analyze` is protected when `X402_ENABLED=true`.
- Add tests that a missing payment returns `402 Payment Required` with payment requirements.
- Add tests that successful payment verification passes through to the normal JSON response, using a mocked/fake verifier if the official middleware supports dependency injection.

Manual real-client test flow:

1. Deploy or run local server with `X402_ENABLED=true`.
2. Set `X402_NETWORK=base-sepolia`.
3. Set a testnet `X402_PAY_TO` address.
4. Configure a testnet facilitator URL.
5. Request `POST /v1/analyze` without payment and confirm `402`.
6. Retry with an x402-compatible client and testnet wallet.
7. Confirm the final response is the normal BS Man Risk API JSON.
8. Confirm free endpoints still work without payment.

Testnet-only checklist:

- Use Base Sepolia, not mainnet.
- Use test funds only.
- Do not log payment headers.
- Do not commit wallet addresses unless they are intended public receiving addresses.
- Verify `X402_ENABLED=false` before running normal local tests.

## 9. Security Cautions

- Never commit private keys.
- Never log payment signatures, payment headers, facilitator API keys, or secrets.
- Do not expose stack traces in API errors.
- Keep the existing disclaimers in responses and docs.
- Validate request body before expensive analysis where practical.
- Avoid charging health, metadata, or OpenAPI endpoints.
- Avoid claiming BS Man AI provides legal advice, financial advice, truth detection, or guarantees.
- Keep x402 disabled by default in local development and tests.
- Treat facilitator errors as operational failures, not as user-visible stack traces.

## 10. Stage 0.6 Implementation Checklist

- Reconfirm current official x402 Hono middleware docs.
- Install required x402 packages.
- Add `src/config/x402.ts`.
- Add x402 middleware around `POST /v1/analyze`.
- Keep `GET /`, `GET /health`, and `GET /docs/openapi.yaml` free.
- Add `.env.example` x402 keys without secrets.
- Update OpenAPI with `402 Payment Required`.
- Update README with exact x402 status and setup instructions.
- Add tests for disabled mode, protected mode, and free endpoints.
- Verify with Base Sepolia testnet.
- Do not deploy mainnet until testnet works end to end.
