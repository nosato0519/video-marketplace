# Video Marketplace Project State

## Current milestone
**Milestone 560 — Vimeo OTT reference visual pass applied; awaiting rendered visual acceptance.**

## Latest checkpoint — 2026-09-05
### Authoritative state
- Repository: `nosato0519/video-marketplace`
- Authoritative branch: `main`.
- Latest production-oriented implementation checkpoint: `581cc444063bbecbafd4cb62e51ab82bfc08d73`.
- Latest customer-facing showcase UI checkpoint before redesign: `5975248a23c529ed2ff2cb5ba6083565c864ca5d`.
- Previous premium showcase redesign commit: `947fc2dec75d32b0b98aed53666c3a5dba8c1d11`.
- Latest Vimeo OTT reference visual pass: `fae909dac4743dbe5414271f7ac158b5303e5c2a`.
- Latest master creation-rules record: `2022d63a10b04d913a7392c688562b5f68f49e67`.
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
- The demo exists to show prospective buyers what the completed video marketplace system looks and feels like; it is not the production service being operated from this repository milestone.
- Existing Buyer/Seller/Admin demo API and workflows are preserved while the presentation layer is redesigned.
- `demo/visual-overhaul.css` is injected by the existing launcher, so the visual redesign does not require a second frontend server.
- The latest visual pass deliberately uses Vimeo OTT's current public information architecture as a close visual study: restrained navigation, oversized editorial hero, black/white blocks, large typography, metric band, feature sections, and strong CTA/footer rhythm.
- Vimeo branding, logos, copy, and proprietary imagery are not used; VIDORA content and existing demo interactions remain in place.
- The requested phrase `見つける。買う。楽しむ。` remains part of the product direction, but the current reference pass prioritizes matching the chosen reference's composition before later customization.

### Latest verification evidence
- Existing CI evidence from 2026-09-04 remains valid for the repository state recorded there: Browser UI Acceptance, Payment Regression, Functional Demo, Browser E2E, and Clean Install were green.
- The new reference visual pass has been committed through GitHub.
- A fresh rendered-browser visual inspection has **not** yet been performed after commit `fae909dac4743dbe5414271f7ac158b5303e5c2a`.
- Therefore this pass must not be called final/complete until the rendered demo is inspected and the required Buyer/Seller/Admin journeys are rechecked.

## Remaining work
### Demo acceptance / sales-demo readiness
1. Wait for the auto-deploy of commit `fae909dac4743dbe5414271f7ac158b5303e5c2a` on the demo Render service.
2. Visually inspect desktop and mobile layouts.
3. Walk buyer journey: browse → detail → purchase → library → watch/download.
4. Walk seller journey: Creator Studio → new product → upload → payout.
5. Walk admin journey: moderation → seller verification → security controls.
6. Fix concrete visual or interaction defects found during inspection.
7. Only after evidence, update this file and `DEV_LOG.md` to mark the visual pass accepted.

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
- The premium/reference redesign may change presentation substantially because the user explicitly rejected the previous visual direction, but must preserve working demo flows.
- Once a gate is GREEN, move directly to the next gate.
