# BS Man AI Bazaar Listing

## Name

BS Man AI

## Short Description

Conversation Risk Intelligence API for AI agents.

## Long Description

BS Man AI helps AI agents and developer tools evaluate communication risk before taking sensitive actions. The BS Man Risk API analyzes English messages, offers, dialogues, and proposed actions for scam signals, manipulation tactics, unrealistic promises, pressure patterns, phishing, wallet risk, and unsafe next-step recommendations.

The first public paid endpoint is `POST /v1/analyze`, protected by x402 on Base mainnet. The main production mode is `agent_action_check`, which tells an agent whether to proceed, proceed with caution, pause and verify, require human review, or not proceed.

## Category

Security / AI agents / Risk intelligence

## Tags

- x402
- AI agents
- scam detection
- risk analysis
- conversation intelligence
- agent safety

## Price

`$0.001` per analyze request.

## Endpoint

```text
POST https://bsman-ai.onrender.com/v1/analyze
```

Free discovery endpoints:

```text
GET https://bsman-ai.onrender.com/
GET https://bsman-ai.onrender.com/health
GET https://bsman-ai.onrender.com/docs/openapi.yaml
```

## Payment Network

- Protocol: x402
- Network: Base mainnet
- Asset: USDC
- Paid endpoint: `POST /v1/analyze`

## Input Schema Summary

Required:

- `mode`: one of `scam_check`, `dialogue_check`, `offer_check`, `manipulation_check`, `safe_reply`, `agent_action_check`
- `input` or `conversation`

Recommended for `agent_action_check`:

- `context.proposed_action`
- `context.asset`
- `context.amount`
- `context.recipient_type`
- `context.channel`
- `context.verification_status`
- `context.sensitive_data_involved`
- `language`: `en`
- `locale`: `US`

## Output Schema Summary

All successful responses include:

- `mode`
- `risk_score`
- `risk_level`
- `summary`
- `detected_patterns`
- `red_flags`
- `recommended_action`
- `safe_reply`
- `disclaimer`

`agent_action_check` also includes:

- `verdict`
- `requires_human_review`
- `next_best_action`
- `action_risk_reasons`

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

## Seller Status

- Public endpoint live: yes
- x402 payment tested: yes
- AgentCash paid request tested: yes
- Stage 1.0 paid request evidence: `docs/stage-1-paid-request-result.md`
