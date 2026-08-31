# Video Marketplace Project State

## Current milestone
**Milestone 473 — Continuation state normalized; avoid duplicate-work loop.**

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
- Existing real HTTP Buyer purchase E2E and Seller Product/Media E2E are implemented.
- Existing backend/browser CI provisions PostgreSQL, runs migrations, starts the real backend, and executes Playwright acceptance.
- Added supplemental mock-based Seller Upload browser acceptance.
- Added `tests/browser-server.js`, a same-origin browser test server serving `/app` and proxying `/api/*` to the real backend.
- Updated `playwright.config.js` so Playwright owns startup of the browser server through `webServer`.
- Browser E2E runs #65 and #66 passed after the routing bridge changes.
- Browser UI Acceptance infrastructure cleanup was committed as `64d2c1133313ddb066f7fcba14fb2f3b2300090b`.
- Latest repository history shows subsequent CI/documentation cleanup commits on `main`; the older Browser E2E PR branch is now divergent and is not the authoritative source for continuation.
- This checkpoint explicitly establishes an anti-duplication rule: never redo a completed implementation merely because an older PR/branch or stale note still describes it as outstanding.

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
- Browser UI Acceptance infrastructure: FIX COMMITTED; runtime rerun still needs authoritative verification.
- Browser-level authenticated Buyer/Seller/Admin acceptance: OUTSTANDING.
- Real non-Stripe provider adapters/runtime: OUTSTANDING.
- Refund-after-payout accounting policy: OUTSTANDING.
- Final commercial release readiness: NOT CLAIMED.

## Remaining work — priority order
1. **Browser acceptance gates — CURRENT**
   - Verify the current `main` workflow state and rerun only the authoritative Browser UI Acceptance gate; do not reuse stale PR-branch assumptions.
   - Build/verify Buyer browser flow: browse → product detail → purchase/session → Account/Orders/Library → protected watch/download against the real backend.
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

## Anti-duplication / continuation protocol
1. At the start of every work cycle, read this file and `PROGRESS_LOG.md`.
2. Inspect the latest `main` commit before relying on any older branch or PR.
3. Search commit history before implementing a feature named in an old TODO; an existing implementation is not to be recreated.
4. Treat the latest `main` state plus these checkpoint files as authoritative; stale PR branches are evidence only.
5. Before editing, state internally what exact acceptance criterion is being advanced. If no criterion advances, do not make a code change.
6. After every meaningful change, record: exact files/commit, verification result, remaining gap, and exact next action in both checkpoint files.
7. Never claim GREEN from an implementation alone; require the relevant runtime/CI evidence.
8. Never force-update a branch when the SHA has moved. Rebase/merge or create a new safe branch instead.

**Latest checkpoint state:** Mainline history has moved beyond the older Browser E2E PR branch. The next work must start from authoritative `main`, verify the current Browser UI Acceptance gate once, then move to outstanding real-backend Buyer/Seller/Admin browser coverage rather than repeating already-completed catalog/backend work.

**These files and the latest repository state are the authoritative continuation source.**
