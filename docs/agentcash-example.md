# AgentCash Example

## Purpose

AgentCash can pay x402 endpoints from an agent wallet. Use it to call BS Man AI when your AgentCash wallet has enough Base mainnet balance.

Do not run paid commands unless you understand the endpoint, network, asset, and price.

## Successful Command Format

Check the endpoint payment requirements:

```bash
npx agentcash@latest check https://api.callbsman.com/v1/analyze
```

Run the paid fetch when your AgentCash wallet is ready:

```bash
npx agentcash@latest fetch https://api.callbsman.com/v1/analyze \
  -m POST \
  -b '{"mode":"agent_action_check","input":"A Telegram admin says I must connect my wallet to verify or lose access.","context":{"proposed_action":"connect_wallet","asset":"wallet","recipient_type":"telegram_admin","channel":"Telegram","verification_status":"unverified","sensitive_data_involved":true},"language":"en","locale":"US"}'
```

Payment details:

- Endpoint: `https://api.callbsman.com/v1/analyze`
- Network: Base mainnet
- Asset: USDC
- Price: `$0.001`
- Mode: `agent_action_check`

## Requirements

- AgentCash installed or runnable through `npx agentcash@latest`
- AgentCash wallet funded on Base mainnet
- Enough balance to cover the `$0.001` x402 payment
- No private keys or seed phrases in this repository

## Expected Behavior

1. AgentCash calls the endpoint.
2. The API returns `402 Payment Required` with the `PAYMENT-REQUIRED` header.
3. AgentCash reads the x402 payment requirement.
4. AgentCash pays from the configured wallet.
5. AgentCash retries the request with payment proof.
6. BS Man AI returns the normal JSON analysis response.

For compatibility with AgentCash-style API clients, the unpaid 402 response also includes a JSON body with `x402Version`, `resource`, `accepts`, and public service metadata. The `PAYMENT-REQUIRED` header is still the canonical x402 payment challenge.

Payment settles only on a successful paid request. If the request is not paid or the wallet cannot satisfy the payment requirement, the API should not return the paid analysis response.

## Expected Response Fields

A successful paid response includes:

- `risk_score`
- `risk_level`
- `summary`
- `detected_patterns`
- `red_flags`
- `recommended_action`
- `disclaimer`

For `agent_action_check`, it also includes:

- `verdict`
- `requires_human_review`
- `next_best_action`
- `action_risk_reasons`

## Example Result Shape

```json
{
  "mode": "agent_action_check",
  "risk_score": 95,
  "risk_level": "critical",
  "verdict": "do_not_proceed",
  "requires_human_review": true,
  "next_best_action": "Do not connect the wallet. Verify the request through an official channel.",
  "action_risk_reasons": [
    "Wallet connection requested by an unverified counterparty.",
    "The message uses urgency and access-loss pressure."
  ]
}
```

## Stage 1.0 Evidence

The Stage 1.0 AgentCash paid request succeeded. Transaction details are recorded in:

```text
docs/stage-1-paid-request-result.md
```

## Safety

- Do not commit AgentCash wallet credentials.
- Do not commit private keys, seed phrases, payment signatures, tokens, or session files.
- Do not print secrets in logs.
- Confirm network and amount before every paid request.
