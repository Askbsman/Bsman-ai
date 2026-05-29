# BS Man AI

Conversation Risk Intelligence API for AI agents.

BS Man AI provides the **BS Man Risk API**, an English-only risk analysis endpoint for messages, offers, dialogues, and proposed AI-agent actions. It helps agents spot scam signals, manipulation tactics, pressure patterns, unsafe payment steps, wallet risks, and suspicious next actions before they proceed.

## Live API

```text
POST https://api.callbsman.com/v1/analyze
```

Primary API endpoint:

```text
https://api.callbsman.com
```

Fallback Render endpoint:

```text
https://bsman-ai.onrender.com
```

Payment:

- Protocol: x402
- Network: Base mainnet
- Price: `$0.001` per analyze request
- Main mode: `agent_action_check`
- Public status: live
- Stage 1.0 evidence: successful AgentCash paid request, with transaction details recorded in `docs/stage-1-paid-request-result.md`

Discovery metadata:

- Bazaar metadata: `docs/bazaar-metadata.json`
- Bazaar listing: `docs/bazaar-listing.md`
- CDP/Bazaar runbook: `docs/cdp-bazaar-runbook.md`
- OpenAPI JSON: `https://api.callbsman.com/openapi.json`
- OpenAPI YAML: `https://api.callbsman.com/openapi.yaml`
- Resource URL: `https://api.callbsman.com/v1/analyze`

The API root at `https://api.callbsman.com/` returns agent-friendly resource metadata, including the paid analyze resource, sample endpoints, x402 payment details, and OpenAPI links.

BS Man AI exposes Bazaar-compatible metadata for x402 discovery. Coinbase Bazaar indexing may require at least one successful paid settlement through the CDP Facilitator. Use `X402_FACILITATOR_PROVIDER=cdp` only with runtime CDP secrets in Render; never commit CDP credentials.

Free endpoints:

```text
GET https://api.callbsman.com/
GET https://api.callbsman.com/health
GET https://api.callbsman.com/openapi.json
GET https://api.callbsman.com/openapi.yaml
GET https://api.callbsman.com/docs/openapi.yaml
```

## Modes

- `agent_action_check`: tells an AI agent whether to proceed, proceed with caution, pause and verify, require human review, or not proceed
- `scam_check`: checks for scams, phishing, impersonation, wallet, payment, crypto, and unrealistic-promise risk
- `dialogue_check`: checks multi-turn pressure, escalation, verification avoidance, and trust-building followed by risky asks
- `offer_check`: checks job, investment, marketplace, rental, loan, and commercial offer risk
- `manipulation_check`: checks urgency, guilt, shame, fear, authority, secrecy, isolation, gaslighting, and pressure tactics
- `safe_reply`: generates a calm boundary-setting reply

## Unpaid Request

Calling the paid endpoint without x402 payment returns `402 Payment Required`:

```bash
curl -i https://api.callbsman.com/v1/analyze \
  -H "content-type: application/json" \
  -d '{"mode":"agent_action_check","input":"A Telegram admin says I must connect my wallet to verify or lose access.","context":{"proposed_action":"connect_wallet","recipient_type":"telegram_admin","channel":"Telegram","verification_status":"unverified","sensitive_data_involved":true},"language":"en","locale":"US"}'
```

Expected result:

```text
HTTP/2 402
```

The `PAYMENT-REQUIRED` header is canonical. The JSON body mirrors the same PaymentRequired payload for clients that read the body, including `x402Version`, `resource.url`, `accepts[0].amount`, `accepts[0].asset`, and `accepts[0].payTo`.

## AgentCash Paid Request

Use AgentCash when your wallet has enough Base mainnet balance for the x402 payment:

```bash
npx agentcash@latest fetch https://api.callbsman.com/v1/analyze \
  -m POST \
  -b '{"mode":"agent_action_check","input":"A Telegram admin says I must connect my wallet to verify or lose access.","context":{"proposed_action":"connect_wallet","recipient_type":"telegram_admin","channel":"Telegram","verification_status":"unverified","sensitive_data_involved":true},"language":"en","locale":"US"}'
```

Before any paid request, confirm:

- Endpoint: `https://api.callbsman.com/v1/analyze`
- Network: Base mainnet
- Asset: USDC via x402
- Price: `$0.001`
- Request mode: `agent_action_check`

## Example Paid Response

```json
{
  "mode": "agent_action_check",
  "risk_score": 95,
  "risk_level": "critical",
  "summary": "Critical communication risk detected. The proposed action should not continue without independent verification.",
  "detected_patterns": [
    {
      "id": "SCAM_TELEGRAM_DISCORD_ADMIN_IMPERSONATION",
      "name": "Telegram/Discord admin impersonation",
      "category": "impersonation",
      "confidence": 0.86,
      "evidence_snippet": "A Telegram admin says I must connect my wallet to verify or lose access."
    }
  ],
  "red_flags": [
    "Unverified admin asks for wallet connection.",
    "Pressure to act or lose access."
  ],
  "recommended_action": "Pause the action and verify the counterparty independently before taking action.",
  "safe_reply": null,
  "disclaimer": "BS Man Risk API analyzes communication risk signals only. It is not legal advice, financial advice, a lie detector, or a guarantee that something is true or false.",
  "verdict": "do_not_proceed",
  "requires_human_review": true,
  "next_best_action": "Do not connect the wallet. Verify the request through an official channel.",
  "action_risk_reasons": [
    "Wallet connection requested by an unverified counterparty.",
    "The message uses urgency and access-loss pressure."
  ]
}
```

## Request Format

```json
{
  "mode": "agent_action_check",
  "input": "Message or offer to analyze.",
  "context": {
    "proposed_action": "send_payment",
    "asset": "USDC",
    "amount": "25",
    "recipient_type": "unknown_wallet",
    "channel": "Telegram",
    "verification_status": "unverified",
    "sensitive_data_involved": false
  },
  "language": "en",
  "locale": "US"
}
```

Agent-friendly object input is also supported:

```json
{
  "mode": "agent_action_check",
  "input": {
    "text": "Message or offer to analyze.",
    "conversation": [],
    "context": {
      "proposed_action": "connect_wallet",
      "verification_status": "unverified"
    }
  },
  "language": "en",
  "locale": "US"
}
```

## Response Fields

- `mode`: selected analysis mode
- `risk_score`: integer from 0 to 100
- `risk_level`: `low`, `medium`, `high`, or `critical`
- `summary`: short risk summary
- `detected_patterns`: matched scam or manipulation patterns with confidence and evidence snippets
- `red_flags`: concise risk signals
- `recommended_action`: mode-aware next step
- `safe_reply`: generated reply for `safe_reply`, otherwise `null`
- `disclaimer`: product disclaimer
- `verdict`: agent action verdict for `agent_action_check`
- `requires_human_review`: boolean for `agent_action_check`
- `next_best_action`: recommended operational action
- `action_risk_reasons`: action-specific reasons

Risk levels:

- `low`: 0-24
- `medium`: 25-49
- `high`: 50-74
- `critical`: 75-100

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

Unsupported language:

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

## Disclaimer

BS Man AI is:

- not legal advice
- not financial advice
- not a lie detector
- not a guarantee that something is true or false

It analyzes communication risk signals only.

## Local Development

```bash
npm install
npm run dev
npm test
npm run build
```

## Documentation

- [Bazaar listing](docs/bazaar-listing.md)
- [API quickstart](docs/api-quickstart.md)
- [AgentCash example](docs/agentcash-example.md)
- [Use cases](docs/use-cases.md)
- [Roadmap](docs/roadmap.md)
- [OpenAPI](docs/openapi.yaml)
- [Pricing](docs/pricing.md)
- [x402 setup](docs/x402-setup.md)
- [Stage 1.0 paid request result](docs/stage-1-paid-request-result.md)
