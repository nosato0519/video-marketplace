# Video Marketplace Project State

## Current milestone
**Milestone 471 — Browser E2E concrete failures corrected; awaiting rerun.**

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
- Fresh Backend Regression #644, Clean Install #229, and PostgreSQL Migration Acceptance #255 passed.
- Existing real HTTP Buyer purchase/media and Seller product/media acceptance suites are implemented.
- Browser proxy `tests/browser-server.js` serves `/app` and proxies `/api/*` to the real backend.
- `playwright.config.js` launches the browser proxy through Playwright `webServer`.
- PR #12 migrated Browser E2E CI from the Python static server to the real-backend proxy.
- CI run 33378083465 exercised the real backend/proxy successfully through startup, migrations, health check, Chromium install, and test discovery; 33/35 browser tests passed.
- Fixed the two concrete browser failures found by CI: removed the duplicate Seller Upload test that used unsupported `Request.body()` and updated Buyer smoke to validate the backend-backed browse page instead of assuming a nonexistent seeded `Featured Video`.

### Current verified status
- Backend regression: **GREEN**.
- Clean install: **GREEN**.
- PostgreSQL migration acceptance: **GREEN**.
- Seller/Buyer real HTTP acceptance: **IMPLEMENTED**.
- Browser proxy: **IMPLEMENTED**.
- Browser CI workflow migration: **IMPLEMENTED IN PR #12**.
- Last Browser E2E run: **33/35 passed; 2 concrete test defects identified and corrected; rerun pending**.
- Browser-level authenticated Buyer/Seller/Admin acceptance: **OUTSTANDING until rerun is GREEN**.
- Real non-Stripe provider adapters/runtime: **OUTSTANDING**.
- Refund-after-payout accounting policy: **OUTSTANDING**.
- Final commercial release readiness: **NOT CLAIMED**.

## Remaining work — priority order
1. Rerun PR #12 Browser E2E and require GREEN.
2. Build/verify authenticated Buyer browser acceptance: browse → product detail → purchase/session → Account/Orders/Library → protected watch/download.
3. Exercise Seller and Admin authenticated browser flows against the real backend.
4. Payment provider integration and provider consistency.
5. Refund/payout accounting integrity.
6. Final release hardening and browser regression gate.

## Continuation rule
On restart, read this file and `PROGRESS_LOG.md` first, inspect the latest `main` commit, active CI/workflow runs, and repository tree, then continue from the latest saved state. After every meaningful milestone, update both checkpoint files with current status, completed work, technical decisions, remaining work, and the exact next step.

**Latest checkpoint:** PR #12 contains the Browser E2E workflow plus concrete test fixes; rerun is the next gate.
