# Video Marketplace Project State

## Current milestone
**Milestone 481 — Release hardening continuation.**

## Latest checkpoint — 2026-09-03
### Authoritative state
- Repository: `nosato0519/video-marketplace`
- Authoritative branch: `main`.
- Current `main` SHA: `a0e0da1cb4875ab23e30c7c3580041c52a1b038c`.
- Mainline Browser E2E uses the existing same-origin Browser Proxy at `/app/index.html`; do not add a second frontend server.

### Completed / verified
- Core storefront/catalog, Buyer purchase/order/Library/watch/download authorization.
- Seller product/media, publishing, ownership isolation, profile, verification, earnings and payout foundations.
- Admin verification/moderation/payout foundations.
- Payment/refund/failure handling.
- Protected media streaming/download and hardened upload validation.
- PostgreSQL migration preflight/execution and legacy BIGINT purchase migration block.
- Production configuration, backup/recovery and commercial package documentation.
- Payout-to-earnings allocation ledger and payout-paid settlement wiring.
- PostgreSQL payout row-locking and cancelled-payout allocation fixes.
- Checkout selected `providerId` passthrough.
- Atomic canonical `seller_earnings` creation on successful payment settlement.
- Atomic/idempotent refund reversal and entitlement revocation.
- Real HTTP Buyer purchase/media acceptance implemented.
- Real HTTP Seller product/media acceptance implemented.
- Real HTTP Seller profile/earnings/payout acceptance implemented, including payout contention, admin status transitions, cancellation, full settlement and audit persistence.
- Real-backend Admin seller-application browser acceptance implemented in the existing seller-application browser suite.
- Product Detail consumes the real backend product-detail API and no longer relies on legacy demo lookup/fallback.
- Browser UI Acceptance run `33708126681` on current `main`: GREEN; buyer browser acceptance and browser module smoke completed successfully.
- Clean Install run `33708126711` on current `main`: GREEN; migration preflight, migrations, migration state and core regression all completed successfully.
- The 429 auth-rate-limit failure in the Admin browser acceptance was fixed in `a0e0da1`; the replacement setup reuses the existing test user's password hash instead of performing a second registration.

### Important no-waste rules
- Do not create duplicate tests, fake fixtures, marker/no-op commits, or CI-trigger-only commits.
- Do not rebuild Buyer/Seller acceptance that is already implemented and verified.
- Do not repeatedly modify CI without a concrete observed failure.
- Before every change, identify the exact acceptance criterion it advances.
- Reuse existing APIs, fixtures, helpers and infrastructure.
- Never claim GREEN without runtime/CI evidence.
- Once a gate is GREEN, move directly to the next gate.

## Remaining work — exact order
1. Verify payment-provider identity/contract consistency and supported-provider scope against the actual checkout/webhook implementation.
2. Verify refund-after-payout accounting integrity and determine whether the current business model explicitly supports or rejects recovery after funds have already been paid out.
3. Perform final release hardening: install/upgrade matrix, provider/secrets readiness, backup/restore, security review and final browser regression/release gate.
4. Only after those gates pass, proceed to the requested demo-screen operation.

## Known design boundary requiring explicit release decision
The current payout ledger preserves paid payout history and marks the underlying seller earning refunded, but the schema does not contain a payout reversal/recovery-liability field. Do not invent a recovery mechanism during release hardening without a concrete business/accounting requirement and schema design.

## Authoritative continuation source
This file plus `PROGRESS_LOG.md` and the latest `main` repository state are authoritative. If a later session reads older checkpoint text saying Buyer/Seller/Admin acceptance is still unverified, prefer the current `main` SHA and the CI evidence recorded above.
