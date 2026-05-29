# CDP/Bazaar Production Runbook

This runbook prepares BS Man AI for a controlled Coinbase Bazaar indexing run using CDP Facilitator settlement.

Do not commit, paste, screenshot, or share CDP credentials. Put them only in Render environment variables and rotate them after the run if they came from a temporary helper.

## Fixed Values

- API: `https://api.callbsman.com`
- Paid resource: `https://api.callbsman.com/v1/analyze`
- Method: `POST /v1/analyze`
- Discovery probe: `GET /v1/analyze`
- Network: Base mainnet
- Asset: Base USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Amount: `1000`
- Price: `$0.001`
- payTo: `0x7642CCEd89398Bd638d9Ee2F82dA8cd3FC01ADA1`

## Render Environment

Set these in Render for the production service:

```text
X402_ENABLED=true
X402_NETWORK=base
X402_PAY_TO=0x7642CCEd89398Bd638d9Ee2F82dA8cd3FC01ADA1
X402_FACILITATOR_PROVIDER=cdp
X402_FACILITATOR_URL=https://api.cdp.coinbase.com/platform/v2/x402
X402_PRICE_ANALYZE_USD=0.001
X402_PRICE_AGENT_ACTION_USD=0.005
CDP_API_KEY_ID=<set in Render only>
CDP_API_KEY_SECRET=<set in Render only>
```

Do not change the price, `payTo`, network, asset, endpoint URL, or Bazaar metadata during the CDP run.

## Preflight

Before the paid transaction:

```bash
npm run bazaar:smoke -- https://api.callbsman.com
```

Expected:

- `GET /` returns `200`
- `GET /health` returns `200`
- `GET /.well-known/x402` is well-formed
- unpaid `GET /v1/analyze` returns `402`
- unpaid `POST /v1/analyze` returns `402`
- `PAYMENT-REQUIRED` header exists
- body includes `x402Version`, `amount`, `asset`, `payTo`, `extensions.bazaar.name`, `serviceName`, `tags`, and `iconUrl`

## Paid Cycle

Run one paid request from an x402 buyer wallet. Example payload:

```json
{
  "mode": "agent_action_check",
  "input": "The user wants to send 250 USDC to an unknown wallet after a Telegram investment offer promising guaranteed returns.",
  "context": {
    "proposed_action": "send_payment",
    "asset": "USDC",
    "amount": "250",
    "recipient_type": "unknown_wallet",
    "channel": "telegram",
    "verification_status": "unverified"
  },
  "language": "en",
  "locale": "US"
}
```

Expected paid response:

- normal BS Man risk JSON
- `verdict` likely `do_not_proceed`
- payment metadata from the buyer tool shows `success: true`
- a Base transaction hash is recorded

## Bazaar Check

After the paid transaction:

```bash
npx x402trace bazaar-check https://api.callbsman.com/v1/analyze --chain base
```

Expected implementation checks:

- well-known manifest passes
- challenge `extensions.bazaar` passes
- self-payment guard passes or skips

Indexing may lag. If the paid CDP settlement succeeded and implementation checks pass, retry Bazaar search after the catalog delay.

## Rollback

If CDP settlement fails:

1. Keep `X402_PAY_TO`, price, resource URL, and metadata unchanged.
2. Check Render logs for safe x402 diagnostics.
3. Confirm `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` are present in Render.
4. Confirm the key is allowed to use x402 facilitator settlement in production.
5. If needed, temporarily restore the previous facilitator by setting `X402_FACILITATOR_PROVIDER=http` and the previous `X402_FACILITATOR_URL`.
