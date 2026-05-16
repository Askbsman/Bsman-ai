# BS Man Risk API Modes

## `scam_check`

Detects scam-like communication patterns such as upfront fees, credential theft, gift card payment requests, fake authority threats, marketplace overpayment, fake jobs, prize fees, and wallet phishing.

## `dialogue_check`

Analyzes conversational pressure and unsafe next-step dynamics, including urgency, isolation from advisors, threats, secrecy, and irreversible money movement.

## `offer_check`

Analyzes offers for unrealistic promises, risky payment conditions, fake job patterns, prize fees, advance-fee loans, and high-return investment claims.

## `manipulation_check`

Focuses on manipulation tactics such as guilt pressure, loyalty tests, secrecy demands, isolation, fast intimacy, artificial scarcity, threats, and unsupported certainty.

## `safe_reply`

Analyzes the input and returns a cautious reply template. The reply avoids accusation and focuses on slowing down, refusing risky actions, and requesting independently verifiable details.

Supported `options.tone` values:

- `calm_firm`
- `polite`
- `direct`
- `neutral`

## `agent_action_check`

Evaluates whether an AI agent should proceed, proceed with caution, pause and verify, require human review, or refuse a proposed action. It combines the message risk signals with action context such as payment, wallet, credential, external-link, or sensitive-data exposure.

Supported context fields:

- `proposed_action`
- `asset`
- `amount`
- `recipient_type`
- `channel`
- `verification_status`
- `sensitive_data_involved`

Dangerous `proposed_action` values:

- `send_payment`
- `share_credentials`
- `share_seed_phrase`
- `connect_wallet`
- `sign_transaction`
- `click_link`
- `download_file`
- `share_sensitive_data`
- `approve_transfer`
- `call_external_tool`

The response includes optional action fields only in this mode:

- `verdict`
- `requires_human_review`
- `next_best_action`
- `action_risk_reasons`
