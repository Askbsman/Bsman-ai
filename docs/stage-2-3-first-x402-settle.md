# Stage 2.3 — First Successful x402 Settlement

## Summary

BS Man AI / Call BS Man API completed its first successful x402 paid request on Base mainnet.

This confirms that the paid endpoint can receive an x402 payment, settle through a facilitator, and return the protected API response after payment.

## Endpoint

POST https://api.callbsman.com/v1/analyze

## Landing

https://callbsman.com

## Network

Base mainnet  
eip155:8453

## Asset

USDC on Base  
0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

## Price

0.001 USDC per analyze request during early discovery.

## Facilitator

Dexter  
https://x402.dexter.cash

## Payment result

success: true

payer:

0x2960F775B87D7dEd3F5b9Bb9eCF7c49434D40a09

transaction:

0xd2f0b207209b6cc2612a69a865f6dd9fdf08dfe89b2eabbf8e80ba8540a04088

network:

eip155:8453

settleDurationMs:

218

## API result

HTTP status: 200

The paid API returned a valid risk analysis response:

- risk_score: 100
- risk_level: critical
- verdict: do_not_proceed
- requires_human_review: true
- next_best_action: Do not perform the proposed action. Stop and require independent verification or human escalation.

## Root cause fixed

Settlement was previously blocked by an ExactEVM token metadata collision.

The service name was accidentally written into:

accepts[0].extra.name

That overwrote the canonical token name returned by ExactEvmScheme.parsePrice().

Bad:

extra.name = "Call BS Man API"

Fixed:

extra.name = canonical token metadata  
extra.bsman.name = "Call BS Man API"

For Base USDC, facilitators expect the canonical token metadata for:

0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

After preserving token metadata and moving BS Man product metadata under extra.bsman, Dexter settlement succeeded.

## Current status

- Landing: live
- API: live
- x402 endpoint: live
- Agentic.Market validator: passed
- x402scan: resource visible
- AgentCash check: detects GET and POST /v1/analyze as paid
- Official @x402/fetch buyer: successful paid request
- First x402 settlement: completed