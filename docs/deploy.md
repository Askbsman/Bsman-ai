# Deployment

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
NODE_ENV=development
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
- No x402 payment secrets are required yet because payment enforcement is not implemented.
- Keep `docs/openapi.yaml` available with the deployed app if using `GET /docs/openapi.yaml`.
