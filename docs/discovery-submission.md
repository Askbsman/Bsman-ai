# Call BS Man API Discovery Submission Profile

## Submission Name

Call BS Man API

## Provider

BS Man AI

## Category

Security

## Short Description

Conversation Risk Intelligence for AI agents.

## Long Description

Call BS Man API analyzes chats, offers, and proposed agent actions for scam signals, manipulation tactics, unsafe payment requests, wallet/payment risk, and risky next steps. It returns structured JSON with `risk_score`, `risk_level`, `detected_patterns`, `red_flags`, `verdict`, `requires_human_review`, and `next_best_action`.

The primary production mode is `agent_action_check`, which helps an AI agent decide whether to proceed, proceed with caution, pause and verify, require human review, or not proceed before taking a sensitive action.

## Primary Endpoint

```text
POST https://api.callbsman.com/v1/analyze
```

## Resource URL

```text
https://api.callbsman.com/v1/analyze
```

Discovery validators may probe GET /v1/analyze. BS Man AI supports GET /v1/analyze as a paid discovery/capability probe and POST /v1/analyze as the paid analysis endpoint.

## Fallback Endpoint

```text
https://bsman-ai.onrender.com/v1/analyze
```

## Free Discovery Endpoints

```text
GET https://api.callbsman.com/
GET https://api.callbsman.com/health
GET https://api.callbsman.com/docs/openapi.yaml
```

## Documentation Links

- Website/docs: `https://callbsman.com`
- OpenAPI: `https://api.callbsman.com/docs/openapi.yaml`
- GitHub: `https://github.com/Askbsman/Bsman-ai`
- Bazaar metadata: `docs/bazaar-metadata.json`
- Bazaar listing draft: `docs/bazaar-listing.md`

## Payment

- Protocol: x402
- Network: Base mainnet
- Asset: USDC
- Price: `$0.001` per analyze request
- Paid discovery probe: `GET /v1/analyze`
- Paid analysis endpoint: `POST /v1/analyze`
- MIME type: `application/json`
- Current facilitator: xpay facilitator on Base mainnet
- Unpaid 402 response: the `PAYMENT-REQUIRED` header is canonical. The JSON body mirrors the same PaymentRequired payload for clients that read the body.

## Discovery And Indexing Note

BS Man AI exposes Bazaar-compatible metadata for x402 discovery. Official Coinbase Bazaar auto-indexing may require CDP Facilitator settlement. The current production endpoint uses xpay facilitator on Base mainnet because CDP onboarding is not available in the current setup.

This profile is intended for manual submission and public distribution. It does not claim an official listing, partnership, certification, endorsement, customer usage metric, or registry acceptance.

## Supported Modes

- `agent_action_check`
- `scam_check`
- `dialogue_check`
- `offer_check`
- `manipulation_check`
- `safe_reply`

## Main Mode

`agent_action_check`

## Tags

- x402
- AI agents
- scam detection
- risk analysis
- conversation intelligence
- agent safety
- payment risk
- wallet safety
- manipulation detection
- Base mainnet
- AgentCash

## Request Schema Summary

```json
{
  "mode": "agent_action_check",
  "input": "string OR object with text/conversation/context",
  "context": {
    "proposed_action": "send_payment",
    "asset": "USDC",
    "amount": "250",
    "recipient_type": "unknown_wallet",
    "channel": "telegram",
    "verification_status": "unverified"
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

The API supports both legacy string input and agent-friendly object input with `input.text`, `input.conversation`, and `input.context`.

## Response Schema Summary

```json
{
  "mode": "agent_action_check",
  "risk_score": 100,
  "risk_level": "critical",
  "summary": "string",
  "detected_patterns": [],
  "red_flags": [],
  "recommended_action": "string",
  "safe_reply": null,
  "disclaimer": "string",
  "verdict": "do_not_proceed",
  "requires_human_review": true,
  "next_best_action": "string",
  "action_risk_reasons": []
}
```

## Example Request

```json
{
  "mode": "agent_action_check",
  "input": "A Telegram admin says I must connect my wallet to verify or lose access.",
  "context": {
    "proposed_action": "connect_wallet",
    "asset": "wallet",
    "recipient_type": "telegram_admin",
    "channel": "Telegram",
    "verification_status": "unverified",
    "sensitive_data_involved": true
  },
  "language": "en",
  "locale": "US"
}
```

## Example Response

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

## Use Cases

- AI agent preflight check before sending payment
- Wallet connection risk check
- Link-clicking and file-download risk check
- Scam and phishing review for user-submitted messages
- Marketplace buyer/seller risk checks
- Crypto community moderation and support flows
- Deal, offer, job, rental, and investment evaluation
- Safe reply generation for suspicious conversations

## Safety Disclaimer

BS Man AI is not legal advice, not financial advice, not a lie detector, and not a guarantee that something is true or false. It analyzes communication risk signals only.

## Suggested Directory Blurb

Call BS Man API is an x402-paid Conversation Risk Intelligence API for AI agents. It checks messages, offers, and proposed agent actions for scam signals, manipulation tactics, unsafe payment requests, wallet/payment risk, and risky next steps before an agent proceeds.

## Suggested Submission Notes

- Public API domain: `https://api.callbsman.com`
- Paid discovery probe: `GET https://api.callbsman.com/v1/analyze`
- Paid resource: `POST https://api.callbsman.com/v1/analyze`
- Fallback resource: `https://bsman-ai.onrender.com/v1/analyze`
- Free OpenAPI endpoint: `https://api.callbsman.com/docs/openapi.yaml`
- x402 network: Base mainnet
- Price: `$0.001` per analyze request
- Current facilitator: xpay facilitator
- Buyer smoke test: AgentCash paid request has succeeded, with evidence recorded in `docs/stage-1-paid-request-result.md`
