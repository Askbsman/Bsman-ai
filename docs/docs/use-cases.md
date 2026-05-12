# BS Man AI Use Cases

BS Man AI is built for agents and tools that need a fast communication-risk check before taking a sensitive next step.

## AI Agents Before Sending Payment

An agent can call `agent_action_check` before sending money, stablecoins, or marketplace payment. The API can flag unknown recipients, off-platform payment, urgency, unrealistic promises, and missing verification.

## AI Agents Before Clicking Links

Agents can check messages before opening links from email, chat, support flows, Telegram, Discord, or marketplace messages. The API can flag phishing language, account-verification pressure, fake support, and suspicious urgency.

## AI Agents Before Connecting Wallets

Wallet-aware agents can check a request before connecting a wallet, signing a transaction, approving a transfer, or sharing sensitive wallet information. This is the core safety path for crypto communities and autonomous assistants.

## AI Agents Before Replying to Suspicious Messages

Agents can use `safe_reply` to generate a short, non-accusatory reply that slows the interaction down, sets a boundary, and asks for official verification.

## Marketplaces

Marketplaces can screen buyer and seller messages for off-platform payment, fake escrow, courier pickup scams, overpayment, chargeback manipulation, suspicious shipping claims, and pressure to bypass platform protections.

## Crypto Communities

Community bots can check wallet verification requests, fake admin messages, token presales, airdrops, seed phrase requests, fake support, and malicious link pressure.

## Support Bots

Support bots can use BS Man AI to evaluate inbound messages or generated responses before suggesting actions that involve credentials, account recovery, payment, software download, or wallet connection.

## Autonomous Assistants

Autonomous assistants can run a preflight check before calling external tools, opening files, clicking links, sending payment, replying to strangers, or continuing a high-pressure conversation.

## Deal and Offer Evaluation

Agents can use `offer_check` for jobs, rentals, loans, grants, supplier offers, wholesale deals, investment pitches, influencer collaborations, and subscription/refund messages.

## Disclaimer

BS Man AI analyzes communication risk signals only. It is not legal advice, financial advice, a lie detector, or a guarantee that something is true or false.
