# Pricing Draft

This is draft pricing for a future x402 MVP. x402 payment enforcement is not implemented in this repository yet.

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
