# AgentCash CLI Notes

## Purpose

AgentCash is an x402-focused wallet and CLI tool for discovering paid endpoints, inspecting payment requirements, and making agent payments. BS Man AI can use it as a buyer-side smoke-test tool for `POST /v1/analyze` after x402 payment enforcement is enabled. The API root and `https://api.callbsman.com/openapi.json` expose agent-friendly discovery metadata for buyer tools.

This document does not add secrets and does not require private keys in the BS Man AI repository.

## Sources Checked

- AgentCash docs: https://agentcash.dev/docs
- AgentCash CLI overview: https://agentcash.dev/docs/cli/overview.md
- AgentCash wallet docs: https://agentcash.dev/docs/cli/wallet.md
- AgentCash fetch/docs flow: https://agentcash.dev/docs/cli/fetch.md
- AgentCash MCP/tool docs: https://agentcash.dev/docs/tools/get_balance.md

## CLI Install / Invocation

AgentCash docs show the CLI can be run through npm without committing it to the project:

```bash
npx agentcash@latest --help
```

For this repo, use the local wrapper:

```bash
npm run agentcash:check
```

The wrapper uses:

```bash
npx -y agentcash@latest wallet info
```

and, when an endpoint is provided:

```bash
npx -y agentcash@latest check <endpoint>
```

## Local Wrapper

Script:

```text
scripts/agentcash-check.mjs
```

Package script:

```bash
npm run agentcash:check
```

Run a balance check only:

```bash
npm run agentcash:check -- --skip-dry-run
```

Run balance plus endpoint dry-run:

```bash
npm run agentcash:check -- --endpoint https://your-api.example.com/v1/analyze
```

Use environment variables instead of flags:

```bash
AGENTCASH_CHECK_ENDPOINT=https://your-api.example.com/v1/analyze npm run agentcash:check
```

On PowerShell:

```powershell
$env:AGENTCASH_CHECK_ENDPOINT="https://your-api.example.com/v1/analyze"
npm run agentcash:check
```

## Safe Overrides

The wrapper is intentionally small and non-spending. It only runs balance/schema-check commands by default.

If AgentCash changes command names, override the CLI args without editing the script:

```bash
AGENTCASH_BALANCE_ARGS="wallet info" npm run agentcash:check -- --skip-dry-run
AGENTCASH_DRY_RUN_ARGS="check https://your-api.example.com/v1/analyze" npm run agentcash:check -- --endpoint https://your-api.example.com/v1/analyze
```

## Dry-Run Expectations

For a BS Man AI endpoint with x402 enabled:

1. `GET /health` should remain free.
2. An unpaid `POST /v1/analyze` should return `402 Payment Required`.
3. AgentCash endpoint check should show the x402 payment requirement without sending funds.
4. A paid request should only be run after confirming the receiving wallet, network, facilitator, and price.

## Current Sandbox Result

Attempted command:

```bash
npx -y agentcash@latest --help
```

Result in this Codex sandbox:

```text
npm could not fetch https://registry.npmjs.org/agentcash and returned EACCES.
```

This appears to be sandbox/network restriction, not a repository problem. The same command should be run from a machine or CI environment with npm registry access.

## Safety Checklist

- Do not commit AgentCash wallet secrets.
- Do not commit private keys, seed phrases, payment signatures, or API keys.
- Do not print wallet secrets in logs.
- Use testnet first when possible.
- Keep `X402_PRICE_ANALYZE_USD=0.001` for the first real mainnet payment check.
- Confirm `X402_NETWORK`, `X402_FACILITATOR_URL`, and `X402_PAY_TO` before any paid request.
