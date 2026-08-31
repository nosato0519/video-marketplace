# Video Marketplace Project State

## Current milestone
**Milestone 474 — Real catalog product detail integration.**

## Latest checkpoint — 2026-08-31
### Completed
- Core storefront/catalog, Buyer purchase/order/Library/watch/download authorization, payment/refund/failure handling.
- Seller product/media, publishing, ownership isolation, profile, verification, earnings and payout UI/API foundations.
- Protected media streaming/download and hardened upload validation with route-level regression tests.
- Reporting/moderation foundations and Admin moderation/payout/verification routes.
- Buyer Account/Orders/Library pages and Seller Dashboard/Product Flow UI.
- Deterministic PostgreSQL migration preflight/execution and legacy BIGINT purchase migration block.
- Production configuration, backup/recovery and commercial package documentation.
- Payout-to-earnings allocation ledger and payout-paid settlement wiring.
- Corrected PostgreSQL payout row-locking and cancelled-payout allocation handling.
- Checkout route passes selected `providerId` through to provider routing.
- Successful payment settlement creates exactly one canonical `seller_earnings` row atomically with payment/order settlement.
- Refund processing reverses the matching seller earning atomically with order refund and entitlement revocation; duplicate refund is idempotent.
- Fresh Backend Regression #644 passed.
- Fresh Clean Install #229 passed.
- Fresh PostgreSQL Migration Acceptance #255 passed.
- Existing real HTTP Buyer purchase/media acceptance and Seller Product/Media acceptance are implemented.
- Existing backend/browser CI provisions PostgreSQL, runs migrations, starts the real backend, and executes Playwright acceptance.
- Added `tests/browser-server.js`, a same-origin browser test server serving `/app` and proxying `/api/*` to the real backend.
- Updated `playwright.config.js` so Playwright owns startup of the browser server through `webServer`.
- Browser E2E runs #65 and #66 passed after the routing bridge changes.
- Browser UI Acceptance infrastructure cleanup was committed as `64d2c1133313ddb066f7fcba14fb2f3b2300090b`.
- Added a real catalog product-detail API endpoint: `GET /api/catalog/products/:id`.
- Added the corresponding frontend catalog API/data loader and changed Product Detail rendering to load the selected published product from the backend instead of treating demo product data as authoritative.
- Preserved demo fallback only for catalog listing compatibility; Product Detail now explicitly uses `allowFallback: false` so missing backend data cannot silently become a fake purchasable product.
- This milestone advances the real-backend Buyer browser path without recreating the already-completed catalog listing API.

### Current verified status
- Backend regression: GREEN (#644).
- Clean install: GREEN (#229).
- PostgreSQL migration acceptance: GREEN (#255).
- Seller payout allocation/settlement runtime: GREEN in #644.
- Admin payout concurrency runtime: GREEN in #644.
- Media authorization/upload/access runtime: GREEN in #644.
- Real HTTP Buyer purchase/media acceptance: IMPLEMENTED.
- Real HTTP Seller product/media acceptance: IMPLEMENTED.
- Browser proxy to real backend: IMPLEMENTED.
- Browser E2E #65: GREEN.
- Browser E2E #66: GREEN.
- Real catalog product detail API: IMPLEMENTED; runtime acceptance pending.
- Browser UI Acceptance infrastructure: FIX COMMITTED; authoritative rerun still needs verification.
- Browser-level authenticated Buyer/Seller/Admin acceptance: OUTSTANDING.
- Real non-Stripe provider adapters/runtime: OUTSTANDING.
- Refund-after-payout accounting policy: OUTSTANDING.
- Final commercial release readiness: NOT CLAIMED.

## Remaining work — priority order
1. **Buyer real-backend browser acceptance — CURRENT**
   - Add/verify browser acceptance that creates/uses a real published product and follows Browse → Product Detail → authenticated Purchase → Orders/Library → protected Watch/Download.
   - Fix only concrete runtime failures.
2. **Seller/Admin real-backend browser acceptance**
   - Exercise Seller application/product/media/dashboard/earnings/payout views.
   - Exercise Admin verification/moderation/payout review.
3. **Payment provider integration**
   - Verify selected `providerId` passthrough and provider identity through webhook/event settlement.
   - Implement supported non-Stripe adapters or explicitly narrow the supported-provider catalog before release.
4. **Refund / payout accounting integrity**
   - Verify refunded earnings cannot be newly paid out.
   - Implement recovery/receivable treatment for refunds after payout where required.
5. **Release hardening**
   - Fresh install/upgrade matrix, production readiness, backup/restore, final security and browser regression gates.

## Anti-duplication / continuation protocol
1. At the start of every work cycle, read this file and `PROGRESS_LOG.md`.
2. Inspect the latest `main` commit before relying on any older branch or PR.
3. Search commit history before implementing a feature named in an old TODO; an existing implementation is not to be recreated.
4. Treat the latest `main` state plus these checkpoint files as authoritative; stale PR branches are evidence only.
5. Before editing, identify the exact acceptance criterion being advanced. If no criterion advances, do not change code.
6. After every meaningful change, record exact files/commit, verification result, remaining gap, and exact next action in both checkpoint files.
7. Never claim GREEN from implementation alone; require runtime/CI evidence.
8. Never force-update a branch when the SHA has moved.

**Latest checkpoint state:** Milestone 474 added real catalog Product Detail loading from the backend. The exact next acceptance criterion is the authenticated Buyer browser purchase-to-Library/Watch/Download path using a real published product.

**These files and the latest repository state are the authoritative continuation source.**
