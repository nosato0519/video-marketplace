# Video Marketplace Project State

## Current milestone
**Milestone 561 — Rendered showcase evidence path fixed; awaiting Browser UI Acceptance evidence.**

## Latest checkpoint — 2026-09-05
### Authoritative state
- Repository: `nosato0519/video-marketplace`
- Authoritative branch: `main`.
- Latest production-oriented implementation checkpoint: `581cc444063bbecbafd4cb62e51ab82bfc08d73`.
- Latest Vimeo OTT reference stylesheet checkpoint: `ef4c2c8a27970fdbe0149b3cc43387296ce3554a`.
- Latest showcase acceptance checkpoint: `2bfc19d3443aae7c3e10047c74f794569d08a698`.
- Latest visual-evidence path fix: `f060bd57355135e493459793c43fc64e260b04f6`.
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

### Demo/showcase distinction and scope
- `demo/` is a lightweight showcase harness with simulated demo state. It is intentionally separate from the production-oriented `app/` + `backend/` system.
- Existing Buyer/Seller/Admin demo API and workflows are preserved while the presentation layer is redesigned.
- `demo/visual-overhaul.css` and `demo/visual-reference-pass-2.css` are injected by the existing launcher; no second frontend server was introduced.
- The visual direction is a close study of current Vimeo OTT information architecture: restrained navigation, oversized featured hero, content rows, strong typography, and structured CTA/footer rhythm. Vimeo branding, logos, copy, and proprietary imagery are not used.
- All previously implemented Buyer/Seller/Admin functionality remains an explicit requirement; visual redesign must not remove or bypass it.

### Latest verification evidence
- Backend Regression run `33941085663` passed the full backend/security/payment/media and functional sales-demo suites for checkpoint `2bfc19d3443aae7c3e10047c74f794569d08a698`.
- Demo Functional E2E run `33941085595` passed health, functional demo E2E and polished showcase acceptance.
- Browser UI Acceptance run `33940944253` passed buyer browser acceptance and browser module smoke before the rendered-evidence addition.
- Render deploy `dep-dadongn9r02s73e30mi0` for the evidence-enabled commit `b9796395da09d63fd3d47d77865bdf4b2a602c1a` is LIVE.
- The visual evidence test now writes screenshots directly under `tests/artifacts/`, matching the workflow upload path.
- A new rendered-browser evidence run is still required before visual acceptance can be marked GREEN.

## Remaining work
### Demo acceptance / sales-demo readiness
1. Obtain the Browser UI Acceptance run for the evidence-enabled commit.
2. Confirm the `rendered-showcase-evidence` artifact exists and inspect its screenshots when accessible.
3. Walk buyer journey: browse → detail → purchase → library → watch/download.
4. Walk seller journey: Creator Studio → new product → upload → payout.
5. Walk admin journey: moderation → seller verification → security controls.
6. Fix only concrete visual or interaction defects found during inspection.
7. After evidence, update this file and `DEV_LOG.md` to mark the visual pass accepted.

### Later customer deployment/operation (not required for current demo completion)
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
- Do not treat production infrastructure as a prerequisite for the current sales-demo milestone.
- The premium/reference redesign may change presentation substantially because the user explicitly requested it, but must preserve all working demo flows.
- **Do not create or package the project as a ZIP during development. Only create a ZIP if the user explicitly asks for one.**
- Once a gate is GREEN, move directly to the next gate.
