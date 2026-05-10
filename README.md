# BS Man AI

Conversation Risk Intelligence API for AI agents.

BS Man AI provides the **BS Man Risk API**, an English-only v0.1 API that analyzes messages, offers, and dialogues for scam signals, manipulation tactics, unrealistic promises, pressure patterns, and unsafe next-step recommendations.

It is built for agent workflows that need a structured communication-risk check before recommending a payment, sharing credentials, continuing a suspicious conversation, or sending a safer reply.

## Status

- API MVP: ready
- x402 payments: implemented behind `X402_ENABLED=true`
- English-only v0.1: yes
- AI provider integration: not yet
- Database: not required for v0.1

## What It Solves

AI agents and developer tools often need to evaluate user-provided messages before taking a next step. BS Man AI returns deterministic, structured risk intelligence that can be used in x402-ready workflows, safety checks, marketplace flows, support triage, and agent preflight decisions.

## What It Is Not

BS Man Risk API is:

- not legal advice
- not financial advice
- not a lie detector
- not a guarantee that something is true or false

It only analyzes communication risk signals.

## Service Endpoints

```text
GET  /
GET  /health
GET  /docs/openapi.yaml
POST /v1/analyze
```

`GET /health` response:

```json
{
  "ok": true,
  "service": "bsman-risk-api",
  "version": "0.1.0"
}
```

## Analyze Modes

- `scam_check`: scam, phishing, impersonation, payment, crypto, wallet, and unrealistic-promise risks
- `dialogue_check`: multi-turn pressure, escalation, avoidance of verification, trust-building followed by risky asks
- `offer_check`: job, investment, marketplace, rental, loan, business, and commercial offer risks
- `manipulation_check`: urgency, guilt, shame, fear, authority, secrecy, isolation, gaslighting, and pressure tactics
- `safe_reply`: calm boundary-setting reply with optional tone
- `agent_action_check`: verdict for whether an AI agent should proceed, pause, verify, require human review, or refuse

Safe reply tones:

- `calm_firm`
- `polite`
- `direct`
- `neutral`

Default tone: `calm_firm`.

## API Example

Request:

```json
{
  "mode": "scam_check",
  "language": "en",
  "input": "Your wallet is suspended. Click this urgent link and enter your seed phrase."
}
```

Response:

```json
{
  "mode": "scam_check",
  "risk_score": 97,
  "risk_level": "critical",
  "summary": "Critical communication risk detected across 2 pattern(s). Treat the message as unsafe until independently verified.",
  "detected_patterns": [
    {
      "id": "SCAM_WALLET_SEED_PHRASE_THEFT",
      "name": "Wallet seed phrase theft",
      "category": "credential_theft",
      "weight": 74,
      "matched_phrases": ["seed phrase", "enter your seed phrase", "wallet is suspended"],
      "confidence": 0.83,
      "evidence_snippet": "Click this urgent link and enter your seed phrase."
    }
  ],
  "red_flags": [
    "Requests a seed phrase or private wallet credential.",
    "No legitimate support process needs wallet recovery words."
  ],
  "recommended_action": "Do not send money or credentials. Verify through an official channel before continuing.",
  "safe_reply": null,
  "disclaimer": "BS Man Risk API analyzes communication risk signals only. It is not legal advice, financial advice, a lie detector, or a guarantee that something is true or false."
}
```

Risk levels:

- `low`: 0-24
- `medium`: 25-49
- `high`: 50-74
- `critical`: 75-100

## Response Fields

- `mode`: selected analysis mode
- `risk_score`: integer from 0 to 100
- `risk_level`: `low`, `medium`, `high`, or `critical`
- `summary`: short risk summary
- `detected_patterns`: matched scam or manipulation patterns
- `red_flags`: concise risk signals
- `recommended_action`: mode-aware next-step recommendation
- `safe_reply`: generated reply for `safe_reply` mode, otherwise `null`
- `disclaimer`: product disclaimer

Each detected pattern includes `confidence` from 0 to 1 and a short `evidence_snippet`.

`agent_action_check` also returns:

- `verdict`: `proceed`, `proceed_with_caution`, `pause_and_verify`, `require_human_review`, or `do_not_proceed`
- `requires_human_review`: boolean
- `next_best_action`: recommended operational next step
- `action_risk_reasons`: action-specific risk reasons

## Curl Examples

### scam_check

```bash
curl -X POST http://localhost:3000/v1/analyze \
  -H "content-type: application/json" \
  -d '{"mode":"scam_check","language":"en","input":"Your wallet is suspended. Click this urgent link and enter your seed phrase."}'
```

### dialogue_check

```bash
curl -X POST http://localhost:3000/v1/analyze \
  -H "content-type: application/json" \
  -d '{"mode":"dialogue_check","language":"en","conversation":[{"role":"counterparty","content":"I care about you and this is a private investment group."},{"role":"counterparty","content":"Do not ask anyone else. Send crypto today before the window closes."}]}'
```

### offer_check

```bash
curl -X POST http://localhost:3000/v1/analyze \
  -H "content-type: application/json" \
  -d '{"mode":"offer_check","language":"en","input":"This crypto investment guarantees 20% weekly returns with no risk if you wire money now."}'
```

### manipulation_check

```bash
curl -X POST http://localhost:3000/v1/analyze \
  -H "content-type: application/json" \
  -d '{"mode":"manipulation_check","language":"en","input":"After everything I did for you, refusing this proves you never cared about me."}'
```

### safe_reply

```bash
curl -X POST http://localhost:3000/v1/analyze \
  -H "content-type: application/json" \
  -d '{"mode":"safe_reply","language":"en","input":"Send the deposit now and do not tell anyone. This deal expires in one hour.","options":{"tone":"calm_firm"}}'
```

### agent_action_check

```bash
curl -X POST http://localhost:3000/v1/analyze \
  -H "content-type: application/json" \
  -d '{"mode":"agent_action_check","language":"en","input":"This crypto investment guarantees 20% weekly returns. Send crypto today to secure your allocation.","proposed_action":"send_payment","asset":"USDC","amount":"100","recipient_type":"unknown_wallet","channel":"Telegram","verification_status":"unverified","sensitive_data_involved":false}'
```

Agent-friendly object input is also supported:

```bash
curl -X POST http://localhost:3000/v1/analyze \
  -H "content-type: application/json" \
  -d '{"mode":"agent_action_check","language":"en","input":{"text":"This crypto investment guarantees 20% weekly returns. Send crypto today to secure your allocation.","conversation":[],"context":{"proposed_action":"send_payment","asset":"USDC","amount":"100","recipient_type":"unknown_wallet","channel":"Telegram","verification_status":"unverified","sensitive_data_involved":false}}}'
```

For compatibility, action context may be sent as top-level fields, inside top-level `context`, or inside `input.context`. If both top-level `context` and `input.context` are present, `input.context` takes priority.

## Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body.",
    "details": []
  }
}
```

Unsupported language response:

```json
{
  "error": {
    "code": "UNSUPPORTED_LANGUAGE",
    "message": "BS Man AI v0.1 supports English only.",
    "details": {
      "supported_languages": ["en"]
    }
  }
}
```

## Local Development

Install dependencies:

```bash
npm install
```

Start the API:

```bash
npm run dev
```

The API listens on `http://localhost:3000` by default. Set `PORT` to use another port.

Run tests:

```bash
npm test
```

Build TypeScript:

```bash
npm run build
```

Start compiled server:

```bash
npm start
```

## x402 Payments

This repository includes x402 middleware wiring for the paid analyze endpoint. It is disabled by default.

Default:

```bash
X402_ENABLED=false
```

When `X402_ENABLED=true`, the paid endpoint is:

```text
POST /v1/analyze
```

Free discovery endpoints remain:

```text
GET /
GET /health
GET /docs/openapi.yaml
```

Required x402 setup for testnet:

```bash
X402_ENABLED=true
X402_NETWORK=base-sepolia
X402_PAY_TO=0xYourReceivingAddress
X402_FACILITATOR_URL=https://facilitator.x402.org
X402_PRICE_ANALYZE_USD=0.001
X402_PRICE_AGENT_ACTION_USD=0.005
```

`base-sepolia` maps to `eip155:84532`. `base` maps to `eip155:8453`.

Never commit payment keys, facilitator API keys, private wallet keys, or seed phrases. Verify on Base Sepolia before any mainnet deployment.

See [docs/x402-setup.md](docs/x402-setup.md), [docs/x402-integration-notes.md](docs/x402-integration-notes.md), and [docs/pricing.md](docs/pricing.md).

## Documentation

- Product spec: [docs/product-spec.md](docs/product-spec.md)
- Modes: [docs/modes.md](docs/modes.md)
- Disclaimer: [docs/disclaimer.md](docs/disclaimer.md)
- Pricing draft: [docs/pricing.md](docs/pricing.md)
- Deployment: [docs/deploy.md](docs/deploy.md)
- x402 notes: [docs/x402-integration-notes.md](docs/x402-integration-notes.md)
- x402 setup: [docs/x402-setup.md](docs/x402-setup.md)
- OpenAPI: [docs/openapi.yaml](docs/openapi.yaml)
- Bazaar metadata: [docs/bazaar-metadata.json](docs/bazaar-metadata.json)

## Roadmap

- Verify x402 payment enforcement on Base Sepolia
- Expand scam and manipulation datasets
- Add more locale-aware English variants
- Add optional AI-assisted analysis after deterministic MVP validation
- Add production deployment recipe and Dockerfile
- Add monitoring and rate-limit guidance
