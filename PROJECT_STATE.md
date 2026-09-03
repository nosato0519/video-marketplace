# Video Marketplace Project State

## Current milestone
**Milestone 492 — Customer-facing showcase correction and release hardening continuation.**

## Latest checkpoint — 2026-09-03
### Authoritative state
- Repository: `nosato0519/video-marketplace`
- Authoritative branch: `main`.
- Latest production-oriented implementation checkpoint: `581cc444063bbecbbafd4cb62e51ab82bfc08d73`.
- Latest customer-facing showcase UI checkpoint: `5975248a23c529ed2ff2cb5ba6083565c864ca5d`.
- Mainline Browser E2E uses the existing same-origin Browser Proxy at `/app/index.html`; do not add a second frontend server.

### Completed / verified core application
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
- Real HTTP Buyer purchase/media acceptance.
- Real HTTP Seller product/media acceptance.
- Real HTTP Seller profile/earnings/payout acceptance.
- Real-backend Admin seller-application browser acceptance.
- Product Detail consumes the real backend product-detail API.
- Seller payment-provider settings persistence without storing provider credentials in the database.
- Media upload write/delete lifecycle through the storage abstraction.
- Graceful HTTP server and PostgreSQL pool shutdown handling.

### Demo/showcase distinction
- `demo/` is a lightweight showcase harness with simulated demo state. It is intentionally separate from the production-oriented `app/` + `backend/` system.
- The previous demo was too developer-console-like for a sales/demo presentation even though its functional test journeys were green.
- `demo/index.html` was therefore corrected into a Japanese-first, customer-facing marketplace presentation with a clear buyer journey and creator selling CTA while preserving the existing demo API/workflows.
- The demo must never be treated as the only evidence of backend completeness.

### Latest core verification evidence
- Previous release-hardening gate for `581cc444063bbecbbafd4cb62e51ab82bfc08d73`: Browser UI Acceptance, Clean Install, Browser E2E, Backend Browser Acceptance, and Backend Regression all GREEN.
- New showcase UI commit requires real-browser verification after Codespaces refresh; do not claim GREEN for that new UI until evidence exists.

## Remaining work
### Demo acceptance
1. Refresh Codespaces and inspect the corrected customer-facing showcase.
2. Walk the buyer journey end-to-end in the demo: browse → detail → purchase → library → watch/download.
3. Walk seller and admin demo journeys and fix concrete UI defects only.

### Production release/deployment
1. Select and configure production hosting/runtime.
2. Provision production PostgreSQL and perform migration plus backup/restore drill.
3. Configure protected production media storage and media backup.
4. Configure production secrets, secure sessions and HTTPS.
5. Configure Stripe live credentials and webhook endpoint.
6. Run final real-browser production smoke/acceptance.

## No-waste rules
- Do not recreate completed Buyer/Seller/Admin acceptance or provider persistence work.
- Do not create marker/no-op or CI-trigger-only commits.
- Only modify code for a concrete release criterion or observed failure.
- Never claim GREEN without runtime/CI evidence.
- Keep demo/showcase evidence separate from production-backend evidence.
- Once a gate is GREEN, move directly to the next gate.
