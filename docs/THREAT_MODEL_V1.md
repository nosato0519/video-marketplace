# Threat Model V1

## Scope
Buyer accounts, seller accounts, administrator accounts, catalog APIs, checkout, orders, entitlements, protected media, payouts, uploads, moderation and the self-hosted deployment.

## High-priority threats
- Unauthorized access to another user's order, library, media or payout data.
- Privilege escalation from buyer/seller to moderator/admin.
- Payment verification bypass or duplicate event processing.
- Exposure of private media or storage credentials.
- Malicious uploads or metadata used to compromise processing or delivery.
- Account takeover through credential attacks or stolen sessions.
- Automated scraping, credential stuffing and excessive downloads.
- Malicious seller content or rights violations.
- Unauthorized redistribution of purchased content.
- Leakage of secrets in source control, logs or frontend bundles.

## Mitigations
- Server-side authorization on every protected resource.
- Object-level ownership checks to prevent IDOR/BOLA.
- Explicit role and permission boundaries.
- Idempotent payment-event processing and server-side price validation.
- Private storage and controlled media delivery.
- Isolated media processing with constrained file handling.
- Secure password hashing, session revocation and rate limiting.
- Audit events for sensitive actions.
- Moderation, takedown and seller-report workflows.
- Secret scanning and release checks.
- Security regression tests for every discovered authorization flaw.

## Residual risk
Self-hosted security depends partly on the operator's infrastructure, updates, HTTPS, credentials, backups and configuration. The product must document this shared responsibility clearly.

No control can guarantee prevention of screen recording, external cameras, or redistribution of a file after an authorized download. Controls are designed for deterrence, authorization, traceability and response.

## Security review rule
Any feature that introduces a new protected resource, role, payment state, file-processing path or external integration must update this threat model and add appropriate tests before release.
