# x402 Setup

x402 payment protection is implemented behind `X402_ENABLED=true`.

Default behavior:

```bash
X402_ENABLED=false
```

With the default value, `POST /v1/analyze` behaves exactly like the local deterministic API and does not require payment.

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

## Security

- Never commit private wallet keys.
- Never commit facilitator API keys.
- Never log payment signatures, payment headers, private keys, or seed phrases.
- Keep stack traces out of API responses.
- Do not deploy mainnet payment enforcement until Base Sepolia works end to end.
