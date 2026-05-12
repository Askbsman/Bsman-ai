# API Quickstart

## Endpoint

```text
POST https://api.callbsman.com/v1/analyze
```

The endpoint is x402-paid on Base mainnet and costs `$0.001` per analyze request.

Discovery validators may probe GET /v1/analyze. BS Man AI supports GET /v1/analyze as a paid discovery/capability probe and POST /v1/analyze as the paid analysis endpoint.

BS Man AI exposes Bazaar-compatible metadata for x402 discovery. Official Coinbase Bazaar auto-indexing may require CDP Facilitator settlement. The current production endpoint uses xpay facilitator on Base mainnet because CDP onboarding is not available in the current setup.

Primary API endpoint:

```text
https://api.callbsman.com
```

Fallback Render endpoint:

```text
https://bsman-ai.onrender.com
```

Discovery references:

- Bazaar metadata: `docs/bazaar-metadata.json`
- OpenAPI JSON: `https://api.callbsman.com/openapi.json`
- OpenAPI YAML: `https://api.callbsman.com/openapi.yaml`
- Resource URL: `https://api.callbsman.com/v1/analyze`
- Fallback resource URL: `https://bsman-ai.onrender.com/v1/analyze`

The API root at `https://api.callbsman.com/` returns agent-friendly resource metadata, including the paid analyze resource, sample endpoints, x402 payment details, and OpenAPI links.

## Unpaid Request

Send a request without payment to inspect the x402 challenge:

```bash
curl -i https://api.callbsman.com/v1/analyze \
  -H "content-type: application/json" \
  -d '{"mode":"agent_action_check","input":"A Telegram admin says I must connect my wallet to verify or lose access.","context":{"proposed_action":"connect_wallet","recipient_type":"telegram_admin","channel":"Telegram","verification_status":"unverified","sensitive_data_involved":true},"language":"en","locale":"US"}'
```

Expected:

```text
HTTP 402 Payment Required
```

Discovery probe:

```bash
curl -i https://api.callbsman.com/v1/analyze
```

When x402 is enabled, unpaid `GET /v1/analyze` also returns `402 Payment Required` with the `PAYMENT-REQUIRED` header. After a verified paid GET, the endpoint returns lightweight capability JSON. It does not run analysis; use paid `POST /v1/analyze` for risk analysis.

The `PAYMENT-REQUIRED` header is canonical. The JSON body mirrors the same PaymentRequired payload for clients that read the body, including `x402Version`, `resource.url`, `accepts[0].amount`, `accepts[0].asset`, and `accepts[0].payTo`.

## Paid Request With AgentCash

Check the endpoint:

```bash
npx agentcash@latest check https://api.callbsman.com/v1/analyze
```

Run the paid fetch:

```bash
npx agentcash@latest fetch https://api.callbsman.com/v1/analyze \
  -m POST \
  -b '{"mode":"agent_action_check","input":"A Telegram admin says I must connect my wallet to verify or lose access.","context":{"proposed_action":"connect_wallet","recipient_type":"telegram_admin","channel":"Telegram","verification_status":"unverified","sensitive_data_involved":true},"language":"en","locale":"US"}'
```

Before running a paid request, confirm:

- Endpoint: `https://api.callbsman.com/v1/analyze`
- Network: Base mainnet
- Asset: USDC
- Price: `$0.001`

## Request Body Examples

### agent_action_check

```json
{
  "mode": "agent_action_check",
  "input": "The seller asks me to pay off-platform before shipping.",
  "context": {
    "proposed_action": "send_payment",
    "asset": "USDC",
    "amount": "40",
    "recipient_type": "marketplace_seller",
    "channel": "marketplace_chat",
    "verification_status": "unverified",
    "sensitive_data_involved": false
  },
  "language": "en",
  "locale": "US"
}
```

Agent-friendly object input is also supported and remains backward compatible with legacy string input:

```json
{
  "mode": "agent_action_check",
  "input": {
    "text": "A Telegram admin says I must connect my wallet to verify or lose access.",
    "conversation": [],
    "context": {
      "proposed_action": "connect_wallet",
      "recipient_type": "telegram_admin",
      "channel": "telegram",
      "verification_status": "unverified"
    }
  },
  "options": {
    "include_safe_reply": true,
    "include_detected_patterns": true,
    "risk_detail_level": "standard"
  },
  "language": "en",
  "locale": "US"
}
```

### scam_check

```json
{
  "mode": "scam_check",
  "input": "Your wallet is suspended. Click this urgent link and enter your seed phrase.",
  "language": "en",
  "locale": "US"
}
```

### safe_reply

```json
{
  "mode": "safe_reply",
  "input": "Send the deposit now and do not tell anyone. This deal expires in one hour.",
  "options": {
    "tone": "calm_firm"
  },
  "language": "en",
  "locale": "US"
}
```

## Supported Modes

- `agent_action_check`
- `scam_check`
- `dialogue_check`
- `offer_check`
- `manipulation_check`
- `safe_reply`

## Response Fields

- `mode`: selected mode
- `risk_score`: 0 to 100
- `risk_level`: `low`, `medium`, `high`, or `critical`
- `summary`: short analysis summary
- `detected_patterns`: matched patterns with confidence and evidence snippets
- `red_flags`: risk signals
- `recommended_action`: mode-aware action
- `safe_reply`: short reply for `safe_reply`, otherwise `null`
- `disclaimer`: safety disclaimer

`agent_action_check` adds:

- `verdict`: `proceed`, `proceed_with_caution`, `pause_and_verify`, `require_human_review`, or `do_not_proceed`
- `requires_human_review`: boolean
- `next_best_action`: recommended action for the agent
- `action_risk_reasons`: reasons tied to the proposed action

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

Common errors:

- `VALIDATION_ERROR`: invalid mode, missing input, invalid JSON, or malformed context
- `UNSUPPORTED_LANGUAGE`: language is not `en`
- `X402_CONFIG_ERROR`: payment configuration problem on the server
- `X402_RUNTIME_ERROR`: payment middleware failed before the payment challenge completed

## Language

BS Man AI v0.1 is English-only. Use:

```json
{
  "language": "en",
  "locale": "US"
}
```

## Stage 1.0 Paid Result

The Stage 1.0 AgentCash paid request succeeded against the live endpoint. Transaction details are recorded in `docs/stage-1-paid-request-result.md`.
