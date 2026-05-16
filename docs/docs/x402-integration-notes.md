# x402 Integration Notes

BS Man AI is x402-ready at the documentation and endpoint-shape level. Real x402 payment enforcement is not implemented yet.

## Paid Endpoint

The future paid endpoint should be:

- `POST /v1/analyze`

This endpoint performs the deterministic communication risk analysis and returns scores, risk levels, detected patterns, evidence snippets, recommended actions, and optional safe replies.

## Free Endpoints

These endpoints should remain free:

- `GET /`
- `GET /health`
- `GET /docs/openapi.yaml`

Agents should be able to discover metadata, check service health, and read the OpenAPI file without payment.

## Expected Payment Behavior

When x402 is implemented:

- Requests to `POST /v1/analyze` without payment should receive the standard x402 payment-required response.
- Paid requests should execute the same analysis contract documented in `docs/openapi.yaml`.
- Payment failures should not run analysis.
- Health and docs endpoints should never require payment.

## Suggested Price

Initial suggested price:

- `$0.001` per `POST /v1/analyze` request

Alternative premium price:

- `$0.005` per request if future versions add richer output, stronger evidence, or AI-assisted analysis.

## Request Example

```json
{
  "mode": "scam_check",
  "language": "en",
  "input": "Your wallet is suspended. Click this urgent link and enter your seed phrase."
}
```

## Response Example

```json
{
  "mode": "scam_check",
  "risk_score": 97,
  "risk_level": "critical",
  "summary": "Critical communication risk detected across 2 pattern(s). Treat the message as unsafe until independently verified.",
  "recommended_action": "Do not send money or credentials. Verify through an official channel before continuing.",
  "safe_reply": null,
  "disclaimer": "BS Man Risk API analyzes communication risk signals only. It is not legal advice, financial advice, a lie detector, or a guarantee that something is true or false."
}
```

## Implementation TODOs

- Select the official x402 SDK or middleware pattern for the target runtime.
- Add payment enforcement only around `POST /v1/analyze`.
- Preserve the existing JSON error format for non-payment validation errors.
- Add tests for paid, unpaid, and free endpoint behavior.
- Document required payment headers or client flow after the SDK is selected.

## Security Cautions

- Do not trust payment headers without official x402 verification middleware.
- Do not leak stack traces or internal payment verification details.
- Keep health and OpenAPI endpoints free to support agent discovery.
- Keep secrets out of the repository and use environment variables for runtime configuration.

## Disclaimer Language

BS Man Risk API analyzes communication risk signals only. It is not legal advice, financial advice, a lie detector, or a guarantee that something is true or false.
