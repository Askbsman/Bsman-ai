# x402 Setup

x402 payment protection is implemented behind `X402_ENABLED=true`.

Default behavior:

```bash
X402_ENABLED=false
```

With the default value, `POST /v1/analyze` behaves exactly like the local deterministic API and does not require payment.

## Public Domains

Primary API endpoint:

```text
https://api.callbsman.com
```

Fallback Render endpoint:

```text
https://bsman-ai.onrender.com
```

Primary paid analyze endpoint:

```text
POST https://api.callbsman.com/v1/analyze
```

## Endpoint Policy

Free endpoints:

- `GET /`
- `GET /health`
- `GET /docs/openapi.yaml`

Paid endpoint when `X402_ENABLED=true`:

- `POST /v1/analyze`

## Environment Variables

```bash
X402_ENABLED=false
X402_NETWORK=base-sepolia
X402_PAY_TO=
X402_FACILITATOR_URL=
X402_PRICE_ANALYZE_USD=0.001
X402_PRICE_AGENT_ACTION_USD=0.005
```

Mappings:

- `X402_NETWORK=base-sepolia` maps to `eip155:84532`
- `X402_NETWORK=base` maps to `eip155:8453`
- CAIP-2 values such as `eip155:84532` can also be used directly

`X402_PRICE_AGENT_ACTION_USD` is documented for pricing policy and future split endpoints. The current middleware protects all `POST /v1/analyze` modes with `X402_PRICE_ANALYZE_USD`.

## Testnet Checklist

1. Set `X402_ENABLED=true`.
2. Set `X402_NETWORK=base-sepolia`.
3. Set `X402_PAY_TO` to a receiving wallet address.
4. Set `X402_FACILITATOR_URL` to a testnet facilitator.
5. Request `POST /v1/analyze` without payment and confirm `402 Payment Required`.
6. Retry with an x402-compatible client and testnet wallet.
7. Confirm the final response is the normal BS Man Risk API JSON.
8. Confirm `GET /`, `GET /health`, and `GET /docs/openapi.yaml` remain free.

## Local Diagnostic Reproducer

Use this local setup to verify the payment middleware path without adding secrets:

```powershell
$env:X402_ENABLED="true"
$env:X402_NETWORK="base-sepolia"
$env:X402_PAY_TO="0x0000000000000000000000000000000000000000"
$env:X402_FACILITATOR_URL="https://x402.org/facilitator"
$env:X402_PRICE_ANALYZE_USD="0.001"
$env:X402_PRICE_AGENT_ACTION_USD="0.005"
npm run dev
```

Then send an unpaid request:

```bash
curl -i http://localhost:3000/v1/analyze \
  -H "content-type: application/json" \
  -d '{"mode":"scam_check","input":"Click this urgent link and enter your seed phrase."}'
```

Expected outcomes:

- `402 Payment Required` means the x402 challenge path is working.
- `X402_RUNTIME_ERROR` means the middleware failed before completing the payment challenge. Check the safe server logs for the x402 error name and message.
- `X402_CONFIG_ERROR` means one or more required x402 environment variables are missing or invalid.
- If the facilitator reports `Make sure to call initialize()`, the x402 resource server or HTTP resource server must be initialized before serving paid endpoints. BS Man AI initializes the x402 payment middleware once before the first paid `POST /v1/analyze` request.

## Troubleshooting

If `POST /v1/analyze` returns `500` after enabling x402:

- Check `X402_PAY_TO` is present and is a 42-character EVM address that starts with `0x`.
- Check `X402_FACILITATOR_URL` is present and is a valid URL.
- Check `X402_NETWORK` is present. `base-sepolia` maps to `eip155:84532`.
- Check Render environment variables and redeploy after changing them.
- Check safe server logs for `X402_RUNTIME_ERROR`; logs include only safe diagnostics such as enabled state, network, pay-to presence and format, facilitator host, and error name/message.
- If the log mentions `Make sure to call initialize()`, verify the deployed build includes the middleware initialization step before the payment challenge.
- Confirm `GET /health` still returns `200` so free endpoints are not being charged.

## Security

- Never commit private wallet keys.
- Never commit facilitator API keys.
- Never log payment signatures, payment headers, private keys, or seed phrases.
- Keep stack traces out of API responses.
- Do not deploy mainnet payment enforcement until Base Sepolia works end to end.
