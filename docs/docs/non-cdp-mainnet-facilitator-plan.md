# Non-CDP Base Mainnet x402 Facilitator Plan

## Goal

Find a production-capable x402 facilitator for BS Man AI that supports Base mainnet without Coinbase CDP registration, works with the current `@x402/hono` / `@x402/core` middleware, and can be tested safely with AgentCash mainnet funds.

This plan does not implement code, change Render environment variables, add secrets, or spend money.

## Current Constraints

- BS Man AI works with `https://x402.org/facilitator` on Base Sepolia.
- `x402.org` is documented as testnet-only and does not support Base mainnet.
- AgentCash wallet funding is available for Base mainnet, not Base Sepolia.
- BS Man AI needs a facilitator that supports:
  - Base mainnet
  - USDC
  - x402 `exact`
  - standard facilitator endpoints compatible with `HTTPFacilitatorClient`

## Sources Checked

- x402 Network and Token Support: https://docs.x402.org/core-concepts/network-and-token-support
- x402 Facilitator concept: https://docs.x402.org/core-concepts/facilitator
- x402 Ecosystem directory: https://www.x402.org/ecosystem
- AgentCash docs: https://agentcash.dev/docs
- AgentCash how it works: https://agentcash.dev/docs/how-it-works
- xpay Facilitator docs: https://docs.xpay.sh/en/x402-protocol/facilitator
- Primer facilitator endpoint: https://x402.primer.systems/
- Primer public site: https://www.primer.systems/
- OpenX402: https://x402.computer/
- Dexter Base facilitator page: https://dexter.cash/facilitator/base
- PayAI Facilitator: https://facilitator.payai.network/
- PayAI authentication docs: https://docs.payai.network/x402/facilitators/authentication
- Treasure facilitator: https://x402.treasure.lol/
- Polygon x402 docs: https://docs.polygon.technology/payment-services/agentic-payments/x402/intro
- Cloudflare x402 docs: https://developers.cloudflare.com/agents/agentic-payments/x402/
- x402.rs: https://x402.rs/
- x402.rs GitHub: https://github.com/x402-rs/x402-rs

## AgentCash Payment Expectations

AgentCash docs say it detects x402 `402 Payment Required` responses, reads payment requirements, signs USDC payment proofs with the local wallet, and retries with payment attached. Its wallet docs describe Base as the default USDC network, with Solana and Tempo also supported.

For BS Man AI, that means the paid endpoint should advertise:

```text
network: eip155:8453
asset: Base USDC
scheme: exact
price: $0.001
payTo: BS Man AI Base mainnet receiving address
```

x402 docs list Base mainnet as:

```text
CAIP-2: eip155:8453
Default USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
Transfer method: EIP-3009
```

This matches AgentCash mainnet Base funding better than Base Sepolia.

## Recommendation Summary

Recommended order:

1. **xpay Facilitator** for first Base mainnet test.
2. **Primer Facilitator** as the second hosted Base candidate.
3. **OpenX402** as a no-account Base mainnet alternate.
4. **Dexter** as another Base mainnet alternate, especially if `exact` and `upto` support matters later.
5. **PayAI** only if the free tier is enough or we are willing to manage API keys after the free tier.
6. **Treasure** if Base + EIP-3009 token support is useful beyond USDC.
7. **Self-hosted x402.rs** only after hosted facilitators are tested.

Do not use Polygon or Cloudflare as the immediate replacement:

- Polygon Facilitator is production-capable, but not Base.
- Cloudflare documents x402 integration and examples, but not a standalone Cloudflare mainnet facilitator endpoint for Render-hosted BS Man AI.

## Option Comparison

| Option | Base mainnet | USDC | Account/API keys | Current Hono fit | URL/config | Readiness | Complexity | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| xpay | Yes | Yes, EIP-3009 USDC | No | Yes | `https://facilitator.xpay.sh`, `eip155:8453` | Strong candidate | Low | Test first |
| Primer | Yes | Yes, EIP-3009 plus broader ERC-20 support | No account requirement found | Yes | `https://x402.primer.systems`, `eip155:8453` | Strong candidate | Low | Test second |
| OpenX402 | Yes | Yes, EIP-3009 USDC | No keys/KYC claimed | Yes | `https://facilitator.openx402.ai`, `eip155:8453` | Plausible candidate | Low | Test after xpay/Primer |
| Dexter | Yes | Docs imply Base settlement and exact scheme | Not clearly required for raw facilitator URL | Likely yes if standard endpoints | `https://x402.dexter.cash`, `eip155:8453` | Plausible candidate | Low-medium | Test as alternate |
| PayAI | Yes | Docs list Base and no-key drop-in setup; auth required beyond free tier | No for free tier; API keys beyond 1,000 settlements/month | Likely yes | `https://facilitator.payai.network`, `base` or `eip155:8453` to verify | Candidate with account caveat | Medium | Consider if xpay/Primer fail |
| Treasure | Yes | EIP-3009 compliant tokens including USDC | Not clearly required | Likely yes if path mapping matches SDK expectations | Docs expose `/facilitator/*` paths at `https://x402.treasure.lol` | Candidate | Medium | Later alternate |
| Polygon | No Base support | Polygon USDC | No account requirement found | Yes if switching network | `https://x402.polygon.technology`, Polygon network | Not suitable for Base | Medium | Do not use for Base launch |
| Cloudflare x402 | Not a facilitator replacement | Integration docs use x402 flow | Cloudflare account for Workers/Agents, not facilitator | Not needed for Render app | Examples use `https://x402.org/facilitator` | Integration surface only | Medium-high | Not immediate |
| Self-hosted x402.rs | Yes | Yes for Base USDC if configured | No third-party account; requires RPC and signer secrets | Yes via hosted URL | `https://facilitator.x402.rs` or self-hosted URL | Viable but operationally heavy | High | Later control option |

## Detailed Options

### xpay Facilitator

Config:

```text
X402_NETWORK=eip155:8453
X402_FACILITATOR_URL=https://facilitator.xpay.sh
```

Base mainnet support: Yes. xpay docs explicitly list Base mainnet `eip155:8453`.

USDC support: Yes. xpay docs describe USDC payment verification and settlement using `transferWithAuthorization` / EIP-3009.

Account/API keys: No. Docs say authentication is not required and the service is permissionless.

Current Hono fit: Yes. Current `HTTPFacilitatorClient({ url })` should work if `/supported`, `/verify`, and `/settle` are standard.

Production readiness: Good first candidate. Docs claim Base mainnet and Base Sepolia support, v1/v2 support, gas sponsorship, no protocol fees, and documented rate limits.

Risks:

- No OFAC/KYT equivalent documented like CDP.
- Public rate limits: verify 100/minute and settle 50/minute.
- Must verify current `/supported` response and one real tiny payment.

Implementation complexity: Low. Likely Render env change only.

Recommended BS Man AI next step:

1. Point a staging service to xpay on Base mainnet.
2. Confirm unpaid `POST /v1/analyze` returns `402`.
3. Use AgentCash only after showing exact command/cost and getting approval.

### Primer Facilitator

Config:

```text
X402_NETWORK=eip155:8453
X402_FACILITATOR_URL=https://x402.primer.systems
```

Base mainnet support: Yes. Primer public docs/site describe a facilitator on Base and list Base URL/endpoints.

USDC support: Yes. Primer’s ecosystem listing says Base v1/v2 with full ERC-20 support, not only EIP-3009. For BS Man AI, keep first test to Base USDC.

Account/API keys: No account or API-key requirement found in the facilitator docs reviewed.

Current Hono fit: Yes if Primer’s endpoint shape matches standard x402 `/supported`, `/verify`, and `/settle`; their facilitator page lists those endpoints.

Production readiness: Good second candidate.

Risks:

- Must verify live `/supported`.
- Broad ERC-20 support is useful but adds complexity; keep USDC first.
- Support/SLA not clear from docs.

Implementation complexity: Low.

Recommended BS Man AI next step:

- Test immediately after xpay if xpay fails or has unacceptable latency/response shape.

### OpenX402

Config:

```text
X402_NETWORK=eip155:8453
X402_FACILITATOR_URL=https://facilitator.openx402.ai
```

Base mainnet support: Yes. OpenX402 states it is live on Base mainnet.

USDC support: Yes. OpenX402 docs state EIP-3009 USDC transfers and CAIP-2 `eip155:8453`.

Account/API keys: No keys or KYC claimed.

Current Hono fit: Likely yes; docs list public `/supported`, `/verify`, and `/settle`.

Production readiness: Plausible candidate, but should be treated as a third test after xpay and Primer because its docs are more marketing-style than SDK-oriented.

Risks:

- Need direct live endpoint tests.
- Operational maturity/SLA unclear.

Implementation complexity: Low.

Recommended BS Man AI next step:

- Add to manual test matrix as a no-account fallback.

### Dexter Facilitator

Config:

```text
X402_NETWORK=eip155:8453
X402_FACILITATOR_URL=https://x402.dexter.cash
```

Base mainnet support: Yes. Dexter’s Base page states full x402 v2 support for Base mainnet.

USDC support: Base settlement is supported; exact USDC details should be confirmed from `/supported` before use.

Account/API keys: Not clearly required for raw facilitator use from the page reviewed.

Current Hono fit: Likely yes if it implements standard x402 facilitator endpoints.

Production readiness: Plausible. The page shows live activity and `exact` + `upto` support.

Risks:

- Docs emphasize Dexter SDK; confirm direct facilitator URL works with `@x402/core`.
- Cross-chain/bridge features are not needed and should not be enabled in first BS Man AI tests.

Implementation complexity: Low to medium.

Recommended BS Man AI next step:

- Test only after xpay/Primer/OpenX402, or earlier if `upto` support becomes important.

### PayAI Facilitator

Config to verify:

```text
X402_FACILITATOR_URL=https://facilitator.payai.network
X402_NETWORK=eip155:8453
```

PayAI docs also show shorthand network values like `base`; BS Man AI should prefer CAIP-2 `eip155:8453` unless `/supported` indicates otherwise.

Base mainnet support: Yes. PayAI docs list Base among supported networks.

USDC support: Yes for x402 USDC-style settlement.

Account/API keys: Mixed:

- Public site says no API keys for drop-in setup.
- Authentication docs say merchant API keys are required beyond the free tier of 1,000 settlements/month.

Current Hono fit: Likely yes for the free tier if standard endpoints accept unauthenticated calls. If auth is required later, code changes would be needed to add `createAuthHeaders` to `HTTPFacilitatorClient`.

Production readiness: Candidate with account/API-key caveat.

Risks:

- Free-tier behavior must be confirmed.
- Long-term production may require account/API keys, which could recreate registration friction.

Implementation complexity: Medium if auth is needed; low if free tier works.

Recommended BS Man AI next step:

- Do not test before xpay/Primer unless those fail.

### Treasure Facilitator

Possible config:

```text
X402_NETWORK=eip155:8453
X402_FACILITATOR_URL=https://x402.treasure.lol/facilitator
```

Base mainnet support: Yes. x402 ecosystem lists Treasure for Base and Base Sepolia.

USDC support: Yes. Treasure docs list EIP-3009 compliant tokens including USDC.

Account/API keys: No account requirement found in reviewed docs.

Current Hono fit: Likely, but note the docs list paths under `/facilitator/supported`, `/facilitator/verify`, and `/facilitator/settle`. Because `HTTPFacilitatorClient` appends endpoint paths to the base URL, BS Man AI may need the base URL to include `/facilitator`.

Production readiness: Plausible but less straightforward than xpay/Primer.

Risks:

- Path prefix must be tested.
- Multi-token support is unnecessary for first launch.

Implementation complexity: Medium due to path-prefix validation.

Recommended BS Man AI next step:

- Keep as later fallback.

### Polygon Facilitator

Config if changing away from Base:

```text
X402_FACILITATOR_URL=https://x402.polygon.technology
X402_NETWORK=eip155:137
```

Base mainnet support: No. Polygon docs are for Polygon mainnet and Polygon Amoy.

USDC support: Yes on Polygon.

Account/API keys: No account requirement found in reviewed docs.

Current Hono fit: Yes only if BS Man AI switches to Polygon.

Production readiness: Production-capable for Polygon, not a Base replacement.

Risks:

- AgentCash Base mainnet funds would not match.
- This breaks the Base-native launch path.

Implementation complexity: Medium because the network and wallet funding path changes.

Recommended BS Man AI next step:

- Do not use for this task.

### Cloudflare x402 / Agentic Payments

Base mainnet support: Cloudflare docs list x402 networks broadly, including Base, but Cloudflare examples use `https://x402.org/facilitator`.

USDC support: Yes at x402 protocol level, but not as a Cloudflare-specific facilitator guarantee.

Account/API keys: Cloudflare account may be needed for Workers/Agents deployment, not for a standalone facilitator.

Current Hono fit: Not relevant unless migrating from Render to Cloudflare.

Production readiness: Good x402 integration surface, not a confirmed standalone mainnet facilitator.

Risks:

- Confusing a deployment/client integration with facilitator operation.
- Does not solve BS Man AI’s immediate Render-hosted Base mainnet facilitator need.

Implementation complexity: Medium-high if migrating platforms.

Recommended BS Man AI next step:

- Do not use as the facilitator replacement.

### Self-Hosted Facilitator / x402.rs

Config if using hosted x402.rs:

```text
X402_NETWORK=eip155:8453
X402_FACILITATOR_URL=https://facilitator.x402.rs
```

Config if self-hosted:

```text
X402_NETWORK=eip155:8453
X402_FACILITATOR_URL=https://<bsman-facilitator-host>
```

Base mainnet support: Yes, if hosted instance or self-host config includes Base RPC. x402.rs docs describe Base USDC support and a hosted instance.

USDC support: Yes for Base USDC, depending on configuration.

Account/API keys: No third-party account, but self-hosting requires:

- RPC provider credentials if using private RPC.
- Facilitator signer key.
- Gas wallet funded with native ETH on Base.

Current Hono fit: Yes via standard facilitator URL.

Production readiness: Viable but operationally heavier.

Risks:

- BS Man AI becomes responsible for gas, uptime, settlement monitoring, RPC failures, key custody, and incident response.
- Private-key management creates a larger security surface.

Implementation complexity: High for self-hosted, low for hosted x402.rs if used as a public URL.

Recommended BS Man AI next step:

- Use only after hosted no-account facilitators are tested.
- Revisit self-hosting if public facilitator reliability or policy becomes a blocker.

## Proposed BS Man AI Test Matrix

No payment should be made until the exact command, endpoint, network, asset, amount, estimated cost, and mainnet/testnet status are shown and explicitly approved.

### Step 1: Read `/supported`

For each candidate:

```bash
curl -i <facilitator-url>/supported
```

Expected:

- HTTP 200.
- Response includes `exact`.
- Response includes Base mainnet, preferably `eip155:8453`.

### Step 2: Configure staging only

Use a staging Render service or local env:

```text
X402_ENABLED=true
X402_NETWORK=eip155:8453
X402_FACILITATOR_URL=<candidate-url>
X402_PAY_TO=<BS Man AI Base mainnet receiving wallet>
X402_PRICE_ANALYZE_USD=0.001
X402_PRICE_AGENT_ACTION_USD=0.005
```

### Step 3: Confirm free endpoints

```bash
curl -i https://<staging-host>/health
curl -i https://<staging-host>/docs/openapi.yaml
```

Expected:

- HTTP 200.
- No payment required.

### Step 4: Confirm unpaid challenge

```bash
curl -i https://<staging-host>/v1/analyze \
  -H "content-type: application/json" \
  -d '{"mode":"scam_check","input":"Send crypto today for guaranteed returns."}'
```

Expected:

- HTTP 402 Payment Required.
- `PAYMENT-REQUIRED` or x402 payment requirements in the response.
- Network is Base mainnet.
- Price is `$0.001`.

### Step 5: Prepare paid AgentCash command, but do not run

Before paid execution, show:

```text
exact command: <to be selected after AgentCash CLI works locally>
endpoint: https://<staging-host>/v1/analyze
network: eip155:8453 / Base mainnet
asset: USDC on Base
amount: $0.001
estimated cost: $0.001 plus any wallet/facilitator/network effects reported by the client
testnet/mainnet: mainnet
```

Only run after explicit approval.

## Final Recommendation

Use **xpay Facilitator** as the first non-CDP Base mainnet candidate:

```text
X402_NETWORK=eip155:8453
X402_FACILITATOR_URL=https://facilitator.xpay.sh
```

Why:

- Official x402 ecosystem listing.
- Public docs confirm Base mainnet and Base Sepolia.
- Public docs confirm USDC EIP-3009 settlement.
- No account/API key requirement.
- Standard facilitator endpoint shape.
- Lowest implementation complexity for the current `@x402/hono` setup.

Use **Primer Facilitator** as the immediate backup:

```text
X402_NETWORK=eip155:8453
X402_FACILITATOR_URL=https://x402.primer.systems
```

Keep **OpenX402** as the no-account third option:

```text
X402_NETWORK=eip155:8453
X402_FACILITATOR_URL=https://facilitator.openx402.ai
```

Do not proceed to paid AgentCash testing until:

- The candidate `/supported` endpoint is verified.
- BS Man AI staging returns a correct unpaid `402`.
- The paid command and exact cost are shown.
- Explicit approval is given.
