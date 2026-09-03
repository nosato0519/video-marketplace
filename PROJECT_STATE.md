# Video Marketplace Project State

## Current milestone
**Milestone 481 — Release hardening continuation.**

## Latest checkpoint — 2026-09-03
### Authoritative state
- Repository: `nosato0519/video-marketplace`
- Authoritative branch: `main`.
- Latest implementation checkpoint: `a2f74f5f738b14e821e521fc8fde1c92269bc9c8`.
- Latest documentation checkpoint: `00c6a112016878e8f15a0db01b047182de8bd6ad`.
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

### Latest automated release-hardening gate
For implementation commit `a2f74f5f738b14e821e521fc8fde1c92269bc9c8`, all five push gates completed GREEN:
- Browser UI Acceptance: `33712744718`.
- Clean Install: `33712744945`.
- Browser E2E: `33712744717`.
- Backend Browser Acceptance: `33712744741`.
- Backend Regression: `33712744691`.

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
