# API Quickstart

## Endpoint

```text
POST https://api.callbsman.com/v1/analyze
```

The endpoint is x402-paid on Base mainnet and costs `$0.001` per analyze request.

Primary API endpoint:

```text
https://api.callbsman.com
```

Fallback Render endpoint:

```text
https://bsman-ai.onrender.com
```

Related public URLs:

- Landing: https://callbsman.com
- OpenAPI: https://api.callbsman.com/docs/openapi.yaml
- GitHub: https://github.com/Askbsman/Bsman-ai

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
