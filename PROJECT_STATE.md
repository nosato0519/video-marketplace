# Video Marketplace Project State

## Current milestone
**Milestone 482 — Release hardening continuation.**

## Latest checkpoint — 2026-09-03
### Authoritative state
- Repository: `nosato0519/video-marketplace`
- Authoritative branch: `main`.
- Latest implementation checkpoint: `581cc444063bbecbbafd4cb62e51ab82bfc08d73`.
- Latest documentation checkpoint: `6fcdd5f8d51801a3e0f07b4b881514189711442d`.
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
- Real HTTP Seller profile/earnings/payout acceptance implemented.
- Real-backend Admin seller-application browser acceptance implemented in the existing seller-application browser suite.
- Product Detail consumes the real backend product-detail API.
- Seller payment-provider settings persistence implemented without storing provider credentials in the database.
- Media upload write/delete lifecycle is routed through the storage abstraction.
- Graceful HTTP server and PostgreSQL pool shutdown handling implemented.

### Latest automated release-hardening gate
For implementation commit `581cc444063bbecbbafd4cb62e51ab82bfc08d73`, all five push gates completed GREEN:
- Browser UI Acceptance: successful.
- Clean Install: successful.
- Browser E2E: successful.
- Backend Browser Acceptance: successful.
- Backend Regression: successful.

### Payment-provider release scope
- Stripe is the implemented live checkout adapter.
- PayPal, Adyen, Paddle and PayPay remain explicitly `adapter_ready` and unavailable for checkout until independently implemented and accepted.
- Provider identity/settings persist without storing provider credentials in the database.

### Refund-after-payout policy boundary
- A refunded seller earning may transition to `refunded` while paid payout history/allocation history remains preserved.
- The current schema intentionally has no payout reversal/recovery-liability field.
- No automatic recovery accounting is invented without an explicit business/accounting requirement.

## Remaining work — deployment-specific only
1. Select and configure production hosting/runtime.
2. Provision production PostgreSQL and perform migration plus backup/restore drill.
3. Configure protected production media storage and media backup.
4. Configure production secrets, secure sessions and HTTPS.
5. Configure Stripe live credentials and webhook endpoint.
6. Run final real-browser production smoke/acceptance.

These are deployment prerequisites, not missing core application features. No public demo or production deployment is claimed until the corresponding infrastructure is actually configured and verified.

## No-waste rules
- Do not recreate completed Buyer/Seller/Admin acceptance or provider persistence work.
- Do not create marker/no-op or CI-trigger-only commits.
- Only modify code for a concrete release criterion or observed failure.
- Never claim GREEN without runtime/CI evidence.
- Once a gate is GREEN, move directly to the next gate.
