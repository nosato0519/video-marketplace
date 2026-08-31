# Video Marketplace Project State

## Current milestone
**Milestone 472 — Browser UI Acceptance port collision fixed.**

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
- Fresh Backend Regression **#644 passed**.
- Fresh Clean Install **#229 passed**.
- Fresh PostgreSQL Migration Acceptance **#255 passed**.
- Existing real HTTP Buyer purchase E2E and Seller Product/Media E2E are implemented.
- Existing backend/browser CI provisions PostgreSQL, runs migrations, starts the real backend, and executes Playwright acceptance.
- Added supplemental mock-based Seller Upload browser acceptance.
- Added `tests/browser-server.js`, a same-origin browser test server serving `/app` and proxying `/api/*` to the real backend.
- Updated `playwright.config.js` so Playwright owns startup of the browser server through `webServer`.
- Browser E2E runs #65 and #66 passed after the routing bridge changes.
- Diagnosed Browser UI Acceptance run #58: the workflow manually started another server on port 4173 while Playwright also started `tests/browser-server.js`, causing a port collision before tests ran.
- Updated `.github/workflows/browser-ui-acceptance.yml` to remove the duplicate manual frontend startup/readiness loop and let Playwright own the server lifecycle.
- Re-read the continuation files before this checkpoint.

### Current verified status
- Backend regression: **GREEN**.
- Clean install: **GREEN**.
- PostgreSQL migration acceptance: **GREEN**.
- Seller payout allocation/settlement runtime: **GREEN in #644**.
- Admin payout concurrency runtime: **GREEN in #644**.
- Media authorization/upload/access runtime: **GREEN in #644**.
- Real HTTP Buyer purchase/media acceptance: **IMPLEMENTED**.
- Real HTTP Seller product/media acceptance: **IMPLEMENTED**.
- Browser proxy to real backend: **IMPLEMENTED**.
- Browser E2E #65: **GREEN**.
- Browser E2E #66: **GREEN**.
- Browser UI Acceptance infrastructure: **FIX COMMITTED; RERUN PENDING**.
- Browser-level authenticated Buyer/Seller/Admin acceptance: **OUTSTANDING**.
- Real non-Stripe provider adapters/runtime: **OUTSTANDING**.
- Refund-after-payout accounting policy: **OUTSTANDING**.
- Final commercial release readiness: **NOT CLAIMED**.

## Remaining work — priority order
1. **Browser acceptance gates — CURRENT**
   - Rerun Browser UI Acceptance after the port-collision fix.
   - Fix concrete browser failures only.
   - Build/verify Buyer browser flow: browse → product detail → purchase/session → Account/Orders/Library → protected watch/download.
   - Exercise Seller application → product/media → dashboard → earnings/payout views against the real backend where feasible.
   - Exercise Admin verification, moderation, and payout review flows against the real backend.
2. **Payment provider integration**
   - Add/verify Checkout HTTP contract coverage for selected `providerId` passthrough.
   - Trace Stripe provider identity from Checkout metadata through webhook/event ledger and `completePayment`.
   - Implement real PayPal, Adyen, Paddle and PayPay adapters or explicitly narrow the supported-provider catalog before release.
3. **Refund / payout accounting integrity**
   - Verify payout eligibility excludes refunded earnings, including after payout creation.
   - Decide/implement recovery/receivable treatment when a previously paid-out earning is later refunded.
4. **Admin integration**
   - Live metrics against verified canonical tables.
   - Admin payout review UI.
   - Seller verification review UI.
   - DB-backed moderation/takedown acceptance.
5. **Release hardening**
   - Fresh install and existing-install upgrade matrix.
   - Production secrets/provider readiness checks.
   - Backup/restore drill with verified artifacts.
   - Final security/authorization review.
   - Final browser regression and release gate.

## Continuation rule
On restart, read this file and `PROGRESS_LOG.md` first, inspect the latest `main` commit, active CI run(s), workflow runs, and repository tree, then continue from the latest saved state. After every meaningful milestone, update both checkpoint files with current status, completed work, technical decisions, remaining work, and the exact next step.

**Latest checkpoint state:** Browser UI Acceptance port collision fixed in commit `64d2c1133313ddb066f7fcba14fb2f3b2300090b`; rerun is the next verification gate.

**These files and the latest repository state are the authoritative continuation source.**
