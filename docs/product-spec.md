# BS Man AI Product Spec

## Product

**Name:** BS Man AI  
**API name:** BS Man Risk API  
**One-liner:** Conversation Risk Intelligence API for AI agents.

BS Man AI analyzes English-language messages, offers, and dialogues for communication risk signals. The v0.1 MVP is designed for x402-native agent workflows where an agent needs a structured risk read before recommending or taking a next step.

## v0.1 Goals

- Provide a deterministic `POST /v1/analyze` endpoint.
- Support scam, dialogue, offer, manipulation, and safe-reply modes.
- Return structured JSON that downstream agents can parse reliably.
- Use local JSON data files for the first sample card set.
- Keep the implementation simple enough to expand with more cards later.

## Non-Goals

- No AI provider integration.
- No database.
- No authentication.
- No frontend.
- No claim that the API can determine truth, intent, legality, or financial suitability.

## Core Output

Every successful analysis returns:

- `mode`
- `risk_score`
- `risk_level`
- `summary`
- `detected_patterns`
- `red_flags`
- `recommended_action`
- `safe_reply`
- `disclaimer`

Detected patterns include matched phrases, a confidence score from 0 to 1, and a short evidence snippet from the analyzed text.

## Disclaimer

BS Man Risk API analyzes communication risk signals only. It is not legal advice, financial advice, a lie detector, or a guarantee that something is true or false.
