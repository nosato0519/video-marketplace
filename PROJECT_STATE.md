# Video Marketplace Project State

## Current milestone
**Milestone 481 — Release hardening continuation.**

## Latest checkpoint — 2026-09-03
### Authoritative state
- Repository: `nosato0519/video-marketplace`
- Authoritative branch: `main`.
- Current `main` release-hardening checkpoint: `b586cda2266ffe6de7daa42d0d550f465e59b7f5`.
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
- Seller payment-provider settings persistence implemented without storing provider credentials in the database.
- Browser UI Acceptance run `33710004553`: GREEN; buyer browser acceptance and browser module smoke completed successfully.
- Backend Regression run `33710004552`: GREEN; migrations, backup/restore, unit/regression suites, payment acceptance, Buyer/Seller/Admin acceptance, media/security suites all completed successfully.

### Payment-provider release scope verified
- The catalog currently identifies Stripe as `available` and PayPal/Adyen/Paddle/PayPay as `adapter_ready`.
- The actual runtime payment-provider factory implements Stripe; non-Stripe catalog entries resolve to an unavailable adapter and cannot be used for checkout.
- Therefore the supported live checkout provider at this checkpoint is Stripe only. Future adapters remain explicitly non-live and are not represented as working checkout providers.
- Provider selection/configuration persists non-secret identity/settings across restart/deploy; credentials remain environment-secret based.

### Important no-waste rules
- Do not create duplicate tests, fake fixtures, marker/no-op commits, or CI-trigger-only commits.
- Do not rebuild Buyer/Seller acceptance that is already implemented and verified.
- Do not repeatedly modify CI without a concrete observed failure.
- Before every change, identify the exact acceptance criterion it advances.
- Reuse existing APIs, fixtures, helpers and infrastructure.
- Never claim GREEN without runtime/CI evidence.
- Once a gate is GREEN, move directly to the next gate.

## Remaining work — exact order
1. Verify/document the refund-after-payout accounting policy boundary; do not invent recovery accounting without an explicit business requirement.
2. Perform final release hardening: install/upgrade matrix, provider/secrets readiness, backup/restore, security review and final browser regression/release gate.
3. Only after those gates pass, proceed to the requested demo-screen operation.

## Known design boundary requiring explicit release decision
The current payout ledger preserves paid payout history and marks the underlying seller earning refunded, but the schema does not contain a payout reversal/recovery-liability field. The release scope currently preserves this boundary rather than inventing a recovery mechanism.

## Authoritative continuation source
This file plus `PROGRESS_LOG.md` and the latest `main` repository state are authoritative. Older checkpoint text must not be used to resurrect already-completed Buyer/Seller/Admin acceptance work.
