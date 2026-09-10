# Video Marketplace Project State

## Current milestone
**Milestone 562 — Browser UI Acceptance / sales-demo navigation stabilization.**

## Latest checkpoint — 2026-09-10
### Authoritative state
- Repository: `nosato0519/video-marketplace`
- Authoritative branch: `main`.
- Latest functional navigation guard commit: `5b4ed0664e51c97a951ef2387df3863abd45706e` (`fix: start demo with homepage navigation guard`).
- Render service: `video-marketplace-demo-live`.
- Latest Render deployment for the navigation guard is **LIVE**: `dep-dah7h6jeogqs739mfu9g`.
- Render deployment completed at `2026-09-10T09:30:47Z`.
- The user confirmed the deployed demo is now visible and the homepage navigation issue is no longer blocking access.

### 2026-09-10 homepage navigation incident and resolution
- Initial homepage HTML contained disabled demo/login controls (`href="#"` and `event.preventDefault()`), so first-load navigation was not reliable.
- The earlier browser acceptance path was misleading because proxy-layer interception could mask defects in the underlying homepage markup.
- Multiple navigation/proxy layers were identified as the structural risk: homepage HTML, `homepage-order-proxy.mjs`, `force-page.mjs`, and the browser-navigation proxy had overlapping navigation behavior.
- `47d1fb8d0fd85d45f4793c9bb70fd7754528770d` made homepage navigation targets explicit and regression-safe.
- `89644d0f128a3500c7b5cf72a86691cde9663003` attempted first-load freshness handling; this is not treated as the root-cause fix.
- `48f5b3ecb49b7f058b66258db8c565d0c3629190` added a dedicated first-load homepage navigation guard.
- `5b4ed0664e51c97a951ef2387df3863abd45706e` changed the demo start command to use `homepage-navigation-guard.mjs` as the authoritative startup path.
- The guard repairs the homepage navigation targets and provides capture-phase routing for:
  - 販売者デモ → `/pages/creator-studio.html`
  - 購入者デモ → `/pages/video-list.html`
  - 販売者ログイン → `/pages/login.html`
  - 購入者ログイン → `/pages/login.html`
- The latest deployed state was manually confirmed by the user as visible.

### Regression-prevention rule — IMPORTANT
- **Do not modify homepage navigation by adding another competing proxy, click interceptor, or cache workaround.**
- `homepage-navigation-guard.mjs` is the current authoritative first-load navigation protection for the demo.
- Any future homepage/child-page modification must preserve the four routes above and must not reintroduce `href="#"` + `preventDefault()` for these controls.
- After any code change that can affect shared startup/proxy/navigation behavior, run the existing navigation verification before considering the change complete.
- Do not declare navigation fixed/green without runtime or CI evidence.
- Do not revert the guard or replace it with a second overlapping navigation mechanism unless a concrete failure is demonstrated and the replacement is tested end-to-end.

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

### Remaining work
1. Inspect/confirm the latest rendered showcase evidence when accessible.
2. Confirm no concrete visual or interaction defects remain.
3. Fix only concrete defects found during inspection.
4. Keep the homepage frozen except for concrete defects or explicitly requested changes.
5. After demo acceptance is stable, proceed to remaining productionization/commercial packaging work.

### No-waste rules
- Do not recreate completed Buyer/Seller/Admin acceptance or provider persistence work.
- Do not create marker/no-op or CI-trigger-only commits.
- Only modify code for a concrete release criterion or observed failure.
- Never claim GREEN without runtime/CI evidence.
- Keep demo/showcase evidence separate from production-backend evidence.
- Do not treat production infrastructure as a prerequisite for the current sales-demo milestone.
- The premium/reference redesign may change presentation substantially because the user explicitly requested it, but must preserve all working demo flows.
- **Do not create or package the project as a ZIP during development. Only create a ZIP if the user explicitly asks for one.**
- Once a gate is GREEN, move directly to the next gate.
