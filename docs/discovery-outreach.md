# Discovery Outreach And Launch Pack

## Status

Prepared on 2026-05-12 for BS Man AI / Call BS Man API.

This is a public-distribution and manual-submission working note. It does not claim an official listing, partnership, endorsement, certification, user metric, or customer metric.

## Submission Targets

### 1. Coinbase CDP Bazaar

Status: not ready for automatic Bazaar indexing until CDP Facilitator settlement is available.

Submission path:

- There is no separate manual registration step for CDP Bazaar.
- CDP Bazaar indexes routes after a Bazaar-enabled route completes at least one successful verify + settle flow through the CDP Facilitator.
- Required later: CDP Facilitator URL, CDP credentials, `bazaarResourceServerExtension`, `declareDiscoveryExtension()`, `paymentPayload.resource`, and one successful CDP settlement.

Current BS Man AI status:

- Bazaar-compatible metadata exists.
- Discovery validators may probe GET /v1/analyze. BS Man AI supports GET /v1/analyze as a paid discovery/capability probe and POST /v1/analyze as the paid analysis endpoint.
- Production settlement currently uses xpay facilitator on Base mainnet.
- Do not switch facilitator until Coinbase/CDP registration is available.

Useful URLs:

- `https://docs.cdp.coinbase.com/x402/bazaar`
- `https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources`
- `https://api.cdp.coinbase.com/platform/v2/x402/discovery/search`

### 2. Agentic.Market

Status: validation target now; marketplace appearance depends on Bazaar indexing.

Submission path:

- Use Seller Tools / Validate Endpoint.
- Agentic.Market says services indexed on Bazaar automatically show up on Agentic.Market.
- There is no separate confirmed manual submission flow found.

Action:

- Validate: `https://agentic.market/validate`
- Endpoint to enter: `https://api.callbsman.com/v1/analyze`

Expected current result:

- x402 endpoint should validate as payment-protected for GET discovery probes when the production deployment includes Stage 1.9.1.
- Bazaar indexed status may remain unavailable until CDP Facilitator settlement is completed.

### 3. x402.org Ecosystem

Status: manual outreach target.

Submission path:

- Use the x402.org contact form from the official site footer.
- Submit as a Services/Endpoints project.

Action:

- Contact form: `https://docs.google.com/forms/d/e/1FAIpQLSc2rlaeH31rZpJ_RFNL7egxi9fYTEUjW9r2kwkhd2pMae2dog/viewform`
- Ecosystem page: `https://www.x402.org/ecosystem`

### 4. Circle Agent Payment Ecosystem

Status: manual outreach target, not a confirmed direct listing path.

Context:

- Circle announced Agent Stack, including Agent Marketplace, Agent Wallets, Circle CLI, Nanopayments, and Circle Skills.
- Public submission mechanics for Agent Marketplace were not found in this pass.
- Circle Alliance Program and Circle partner contact are the best current manual routes for ecosystem visibility.

Action:

- Agent Stack announcement: `https://www.circle.com/blog/introducing-circle-agent-stack-financial-infrastructure-for-the-agentic-economy`
- Circle partner contact: `https://www.circle.com/contact/partner`
- Circle Alliance Program: `https://www.circle.com/alliance-program`
- Agents product entry point from Circle press release: `http://agents.circle.com`

### 5. AgentCash / x402 Buyer Discovery

Status: buyer docs target; live CLI check was attempted but blocked by this environment before reaching the endpoint.

Known AgentCash discovery expectations:

- AgentCash can inspect pricing and schemas before committing.
- AgentCash discovery prefers an OpenAPI document at `/openapi.json`.
- It also checks runtime `402` behavior.
- AgentCash discovery docs recommend validation commands:
  - `npx -y @agentcash/discovery@latest discover "$TARGET_URL"`
  - `npx -y @agentcash/discovery@latest check "$TARGET_URL"`

Current BS Man AI status:

- OpenAPI is available at `https://api.callbsman.com/docs/openapi.yaml`.
- Runtime x402 paid request has previously succeeded through AgentCash.
- Unpaid `GET /v1/analyze` and `POST /v1/analyze` responses include the canonical `PAYMENT-REQUIRED` header plus a JSON compatibility body for AgentCash-style API clients.
- A canonical `/openapi.json` endpoint and AgentCash-specific `x-payment-info` annotations may improve discoverability later.

Attempted check:

```bash
npx --yes agentcash@latest check https://api.callbsman.com/v1/analyze
```

Result in this environment:

```text
Failed before endpoint validation: npm registry access for agentcash@latest was blocked with EACCES.
```

Next local check on a machine with npm network access:

```bash
npx --yes agentcash@latest check https://api.callbsman.com/v1/analyze
npx --yes @agentcash/discovery@latest check https://api.callbsman.com
npx --yes @agentcash/discovery@latest discover https://api.callbsman.com
```

Do not run:

```bash
npx agentcash@latest fetch https://api.callbsman.com/v1/analyze ...
```

unless intentionally making a paid request.

### 6. Optional Additional Directories To Watch

These are candidate ecosystem surfaces, not confirmed official BS Man AI submission targets yet:

- `https://x402.eco/`
- `https://x402.direct/`
- `https://agent402.app/`
- `https://agora402.io/`
- `https://payanagent.com/`

Use only factual copy and avoid claiming listing status until accepted.

## Short Submit Text

Call BS Man API is an x402-paid Conversation Risk Intelligence API for AI agents. It analyzes chats, offers, and proposed agent actions for scam signals, manipulation tactics, unsafe payment requests, wallet/payment risk, and risky next steps before an agent proceeds.

Endpoint: `POST https://api.callbsman.com/v1/analyze`

Payment: x402 on Base mainnet, USDC, `$0.001` per analyze request.

Main mode: `agent_action_check`.

Output: structured JSON with `risk_score`, `risk_level`, `detected_patterns`, `red_flags`, `verdict`, `requires_human_review`, and `next_best_action`.

Docs: `https://callbsman.com`

OpenAPI: `https://api.callbsman.com/docs/openapi.yaml`

GitHub: `https://github.com/Askbsman/Bsman-ai`

Note: BS Man AI exposes Bazaar-compatible metadata for x402 discovery. Official Coinbase Bazaar auto-indexing may require CDP Facilitator settlement. The current production endpoint uses xpay facilitator on Base mainnet because CDP onboarding is not available in the current setup.

## One-Line Version

Call BS Man API is an x402-paid Conversation Risk Intelligence API that helps AI agents detect scam, manipulation, payment, and wallet risk before taking sensitive actions.

## X Launch Post

Call BS Man API is live as an x402-paid endpoint on Base mainnet.

It gives AI agents a preflight risk check before payments, wallet actions, links, files, or external tool calls.

POST `https://api.callbsman.com/v1/analyze`

`$0.001` per analyze request via x402.

Discovery-compatible GET probe: `https://api.callbsman.com/v1/analyze`

Main mode: `agent_action_check`

Returns structured JSON: `risk_score`, `risk_level`, `red_flags`, `verdict`, `requires_human_review`, `next_best_action`.

Docs: `https://callbsman.com`

## Farcaster Launch Post

Launched: Call BS Man API.

An x402-paid Conversation Risk Intelligence API for AI agents on Base mainnet.

Agents can call `POST /v1/analyze` before risky actions like sending payment, connecting a wallet, clicking links, downloading files, or calling external tools.

Price: `$0.001` per analyze request.

Output includes risk score, risk level, red flags, verdict, human-review flag, and next best action.

Docs: `https://callbsman.com`

## LinkedIn Launch Post

BS Man AI now has a live x402-paid API endpoint for agent safety workflows.

Call BS Man API provides Conversation Risk Intelligence for AI agents. It analyzes chats, offers, and proposed agent actions for scam signals, manipulation tactics, unsafe payment requests, wallet/payment risk, and risky next steps before an agent proceeds.

The first paid endpoint is:

`POST https://api.callbsman.com/v1/analyze`

It runs on x402, Base mainnet, USDC, at `$0.001` per analyze request.

The main mode is `agent_action_check`, returning structured JSON with `risk_score`, `risk_level`, `detected_patterns`, `red_flags`, `verdict`, `requires_human_review`, and `next_best_action`.

This is designed for agent preflight checks before payments, wallet actions, links, files, credential sharing, and external tool calls.

Docs: `https://callbsman.com`

OpenAPI: `https://api.callbsman.com/docs/openapi.yaml`

## Telegram Launch Post

Call BS Man API is live.

It is an x402-paid risk intelligence endpoint for AI agents.

Use it before an agent sends payment, connects a wallet, clicks a link, downloads a file, shares sensitive data, or calls an external tool.

Endpoint:

`POST https://api.callbsman.com/v1/analyze`

Payment:

- x402
- Base mainnet
- USDC
- `$0.001` per analyze request

Main mode:

`agent_action_check`

Returns:

- `risk_score`
- `risk_level`
- `red_flags`
- `verdict`
- `requires_human_review`
- `next_best_action`

Docs:

`https://callbsman.com`

## CDP/Bazaar Follow-Up

Return to CDP/Bazaar when Coinbase registration is available.

Checklist:

- Create or restore CDP registration.
- Configure CDP Facilitator for a staging environment first.
- Preserve current xpay production flow until CDP settlement is tested.
- Confirm `bazaarResourceServerExtension` remains registered.
- Confirm `declareDiscoveryExtension()` metadata remains valid.
- Ensure `paymentPayload.resource` is set to `https://api.callbsman.com/v1/analyze`.
- Complete one successful paid settlement through CDP Facilitator.
- Inspect CDP `EXTENSION-RESPONSES` for Bazaar extension status.
- Query CDP discovery resources/search endpoints after catalog delay.
- Validate Agentic.Market endpoint again.

Do not add CDP secrets to the repository.

## References Checked

- CDP Bazaar discovery layer: `https://docs.cdp.coinbase.com/x402/bazaar`
- Agentic.Market endpoint validator: `https://agentic.market/validate`
- x402 ecosystem page and contact form: `https://www.x402.org/ecosystem`
- AgentCash server discovery guide: `https://agentcash.dev/docs/guides/server-discovery`
- AgentCash CLI overview: `https://agentcash.dev/docs/cli/overview`
- Circle Agent Stack announcement: `https://www.circle.com/blog/introducing-circle-agent-stack-financial-infrastructure-for-the-agentic-economy`
