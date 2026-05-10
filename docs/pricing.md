# Pricing Draft

This is pricing guidance for the x402 MVP. x402 middleware is implemented behind `X402_ENABLED=true`; local and test runs should keep it disabled unless payment behavior is being tested.

## Option A

- `$0.001` per `POST /v1/analyze` request
- Simple default for broad agent usage
- Health, metadata, and docs endpoints remain free

## Option B

- `$0.005` per `POST /v1/analyze` request with full patterns and `safe_reply`
- Best fit if richer pattern evidence and reply generation are treated as premium output
- Health, metadata, and docs endpoints remain free

## Option C

- Free endpoints:
  - `GET /`
  - `GET /health`
  - `GET /docs/openapi.yaml`
- Paid endpoint:
  - `POST /v1/analyze`

Option C is the preferred x402 MVP shape because it lets agents discover the API and health-check it without payment, while charging only for risk analysis.

Current middleware behavior:

- `GET /`, `GET /health`, and `GET /docs/openapi.yaml` are free.
- `POST /v1/analyze` is paid when `X402_ENABLED=true`.
- The route-level x402 price currently uses `X402_PRICE_ANALYZE_USD`.
- `X402_PRICE_AGENT_ACTION_USD` is reserved for future split pricing or a dedicated agent action endpoint.
