# Video Marketplace Project State

## Current milestone
**Milestone 467 — Authenticated browser E2E checkpoint and real HTTP purchase/media verification.**

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
- **PR #8 merged to `main`** with squash merge commit `0dd062065fdcbf96355ec23adb117b64eb7e2998`.
- Fresh Backend Regression **#644 passed**, including Unit 187/187, authentication, payment/refund, Buyer purchase, Seller application/product-media, Seller earnings/payout, Admin payout concurrency, and media authorization/upload/access checks.
- Fresh Clean Install **#229 passed**.
- Fresh PostgreSQL Migration Acceptance **#255 passed**.
- Existing real HTTP Buyer purchase E2E verified in repository: it creates seller/buyer/media/product/session data, performs a real order, signed payment webhook, checks paid order + Library entitlement, downloads protected media, and verifies a non-buyer is denied.
- Existing real HTTP Seller Product/Media E2E verified in repository: real Seller/media/product creation, upload, draft/edit/publish, ownership isolation and post-publish edit restrictions are covered.
- Existing `backend-browser-acceptance.yml` CI environment provisions PostgreSQL, runs migrations, executes the real HTTP Seller/Buyer/Media/payment/security acceptance suites, starts the real backend, and runs a real-browser acceptance test.
- Added a browser-level Seller Upload acceptance spec (`tests/browser-seller-upload-acceptance.spec.js`) covering browser upload → media API → product draft API wiring. This test currently uses API mocks and is supplemental, not a replacement for the real HTTP E2E.

### Current verified status
- Backend regression: **GREEN**.
- Clean install: **GREEN**.
- PostgreSQL migration acceptance: **GREEN**.
- Seller payout allocation/settlement runtime: **GREEN in #644**.
- Admin payout concurrency runtime: **GREEN in #644**.
- Media authorization/upload/access runtime: **GREEN in #644**.
- Real HTTP Buyer purchase/media acceptance: **IMPLEMENTED**.
- Real HTTP Seller product/media acceptance: **IMPLEMENTED**.
- Browser-level authenticated Buyer/Seller/Admin acceptance: **OUTSTANDING**.
- Real non-Stripe provider adapters/runtime: **OUTSTANDING**.
- Refund-after-payout accounting policy: **OUTSTANDING**.
- Final commercial release readiness: **NOT CLAIMED**.

## Remaining work — priority order
1. **Authenticated browser E2E — CURRENT**
   - Convert/extend browser acceptance so Buyer browse → product detail → purchase/session → Account/Orders/Library → protected watch/download is exercised against the real backend.
   - Exercise Seller application → product/media → dashboard → earnings/payout views against the real backend where feasible.
   - Exercise Admin verification, moderation, and payout review flows against the real backend.
   - Keep mock-based UI acceptance tests as supplemental coverage only.
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

**Latest main:** `0dd062065fdcbf96355ec23adb117b64eb7e2998`.

**These files and the latest repository state are the authoritative continuation source.**
