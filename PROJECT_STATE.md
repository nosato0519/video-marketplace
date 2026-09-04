# Video Marketplace Project State

## Current milestone
**Milestone 555 — Release-hardening state synchronized after all major CI gates passed.**

## Latest checkpoint — 2026-09-04
### Authoritative state
- Repository: `nosato0519/video-marketplace`
- Authoritative branch: `main`.
- Latest production-oriented implementation checkpoint: `581cc444063bbecbbafd4cb62e51ab82bfc08d73`.
- Latest customer-facing showcase UI checkpoint: `5975248a23c529ed2ff2cb5ba6083565c864ca5d`.
- Latest demo launcher fix: `22e1516f10e2a95de5103023abaceca335204077`.
- Latest demo acceptance strengthening: `849bbfddc0a86f8257b4b6adddc7f0aafe3a5ee3`.
- Latest progress-state synchronization commit: `dd10d7b1d5ce66c8259bcd5a0f461dcc98c752a9`.
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
- The showcase was corrected into a Japanese-first, customer-facing marketplace presentation with a clear buyer journey and creator selling CTA while preserving the existing demo API/workflows.
- The launcher now explicitly preserves the default `All categories` filter option, with a regression assertion covering that wiring.
- The demo must never be treated as the only evidence of backend completeness.

### Latest verification evidence — 2026-09-04
All major automated release-hardening gates are GREEN on the latest CI set:
- Browser UI Acceptance: run `33843376544`, job `100930038320` — success.
- Payment Regression: run `33843376547`, job `100930038407` — success.
- Functional Demo: run `33843376578`, job `100930038477` — success.
- Browser E2E: run `33843376600`, job `100930038472` — success.
- Clean Install: run `33843376615` — Node 22 job `100930038729` success; Node 20 job `100930039376` success.
- The successful gates cover the backend payment/webhook/protected-media regressions, functional demo verification and showcase acceptance, real-browser UI/E2E coverage, and clean-install/migration/core regression coverage.
- These results validate the current repository/CI state. They do **not** constitute production deployment or live Stripe acceptance.

## Remaining work
### Demo acceptance
1. Refresh Codespaces and visually inspect the corrected customer-facing showcase.
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
