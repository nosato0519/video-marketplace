# Video Marketplace Project State

## Current milestone
**Milestone 562 — Browser UI Acceptance GREEN; rendered showcase evidence path verified.**

## Latest checkpoint — 2026-09-10
### Authoritative state
- Repository: `nosato0519/video-marketplace`
- Authoritative branch: `main`.
- Latest navigation proxy fix: `2fe536620fc7a17166bb7dd95a5b5e8cf312aa8b`.
- Browser UI Acceptance run `34457815795` passed all steps, including showcase navigation acceptance and rendered showcase evidence capture/upload.
- The navigation proxy now reuses the existing Browser test server instead of spawning a conflicting second frontend server.

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
- The visual direction is a close study of current Vimeo OTT information architecture: restrained navigation, oversized featured hero, content rows, strong typography, and structured CTA/footer rhythm. Vimeo branding, logos, copy, and proprietary imagery are not used.
- All previously implemented Buyer/Seller/Admin functionality remains an explicit requirement; visual redesign must not remove or bypass it.

### Latest verification evidence
- Browser UI Acceptance run `34457815795` is GREEN.
- All browser acceptance steps passed: buyer browser acceptance, browser module smoke, showcase navigation acceptance, rendered showcase evidence capture, and artifact upload.
- Navigation regression caused by the proxy startup path is resolved.
- Patch workflow run `34457815783` completed successfully.

## Remaining work
### Demo acceptance / sales-demo readiness
1. Inspect the `rendered-showcase-evidence` artifact from run `34457815795` when accessible.
2. Confirm the captured screenshots show the intended polished showcase and no concrete visual/interaction defects.
3. Fix only concrete visual or interaction defects found during inspection.
4. After evidence inspection, update `PROJECT_STATE.md` and `PROGRESS_LOG.md` to close the visual acceptance gate.

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
