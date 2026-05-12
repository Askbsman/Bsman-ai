# Deployment

## Live Deployment

- Landing: https://callbsman.com
- API: https://api.callbsman.com
- Analyze endpoint: POST https://api.callbsman.com/v1/analyze
- OpenAPI: https://api.callbsman.com/docs/openapi.yaml
- Fallback API: https://bsman-ai.onrender.com
- GitHub: https://github.com/Askbsman/Bsman-ai
- Landing host: Cloudflare Pages
- API host: Render behind `api.callbsman.com`
- Payment: x402 on Base mainnet
- Price: `$0.001` per analyze request

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Default local URL:

```text
http://localhost:3000
```

## Environment Variables

See `.env.example`.

```bash
PORT=3000
NODE_ENV=production
X402_ENABLED=true
X402_NETWORK=base
X402_PAY_TO=
X402_FACILITATOR_URL=
X402_PRICE_ANALYZE_USD=0.001
X402_PRICE_AGENT_ACTION_USD=0.005
```

## Build

```bash
npm run build
```

## Start

```bash
npm start
```

The start command runs the compiled Node.js server from `dist/server.js`.

## Public Domains

Primary API endpoint:

```text
https://api.callbsman.com
```

Fallback Render endpoint:

```text
https://bsman-ai.onrender.com
```

Render remains the infrastructure host. Public docs and client examples should prefer the custom domain.

Landing:

```text
https://callbsman.com
```

## Docker Plan

Docker is not included yet. A future Dockerfile should:

- use a current Node.js LTS base image
- install production dependencies
- run `npm run build`
- copy `dist`, `docs`, `package.json`, and `package-lock.json`
- expose `PORT`
- run `npm start`

## Suggested Deployment Targets

- Railway
- Render
- Fly.io
- VPS + PM2

Cloudflare Workers may be a good future target, but the Hono runtime entrypoint would need to be adapted for Workers before deploying there.

## Runtime Notes

- No database is required for v0.1.
- No AI provider keys are required.
- The public API has x402 payment enforcement enabled on Base mainnet.
- Local or staging environments can keep `X402_ENABLED=false` when payment behavior is not being tested.
- Keep `docs/openapi.yaml` available with the deployed app if using `GET /docs/openapi.yaml`.

## x402 Troubleshooting

If `POST /v1/analyze` returns `500` after `X402_ENABLED=true`:

- Check `X402_PAY_TO` is set in Render and looks like a 42-character EVM address beginning with `0x`.
- Check `X402_FACILITATOR_URL` is set and is a valid production x402 facilitator URL.
- Check `X402_NETWORK` is set. `base` maps to `eip155:8453`.
- Check `X402_PRICE_ANALYZE_USD` and `X402_PRICE_AGENT_ACTION_USD` are positive numbers.
- Redeploy after changing Render environment variables.
- Check server logs for safe x402 diagnostics. The API returns `X402_CONFIG_ERROR` for invalid config and `X402_RUNTIME_ERROR` if the payment middleware fails before returning a payment challenge.
- Confirm `GET /health` remains `200`; health and docs endpoints should stay free.

Do not log or commit private keys, seed phrases, payment signatures, payment headers, or secret facilitator credentials.
