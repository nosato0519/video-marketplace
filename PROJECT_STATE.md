# Video Marketplace Project State

## Current milestone
**Milestone 477 — Main browser E2E routed through the real-backend proxy; next gate is runtime verification.**

## Latest checkpoint — 2026-09-01
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
- Existing real HTTP Buyer purchase/media acceptance is implemented.
- Existing real HTTP Seller product/media acceptance is implemented.
- Existing backend/browser CI provisions PostgreSQL, runs migrations, starts the real backend, and executes Playwright acceptance.
- Same-origin browser server proxies `/api/*` to the real backend.
- Playwright owns browser-server startup through `webServer`.
- Browser E2E #65/#66 passed.
- Backend already exposes real catalog listing at `/api/catalog/products` and real product detail at `/api/catalog/products/:productId`.
- Added `app/catalog/product-detail-api.js` to consume the real product-detail endpoint.
- Updated `app/main.js` Product Detail to load/render the real backend product and removed its demo-product lookup/fallback.
- Updated `main` `.github/workflows/browser-e2e.yml` to run Browser E2E through the existing same-origin proxy with `BROWSER_BACKEND_URL=http://127.0.0.1:3000` instead of the Python static server.

### Important corrections / process
- `main` is authoritative; stale PR branches and old TODOs are not the source of truth.
- Catalog backend/listing work must not be recreated; commit history confirmed those pieces already exist.
- Product Detail was the actual demo-backed gap found and addressed in Milestone 475.
- The earlier work contained unnecessary repeated marker/branch/duplicate-test activity. This is accepted as past history and is not to be repeated.
- **Mandatory no-waste rule from 2026-09-01:** before every change, identify the exact acceptance criterion it advances; if it does not advance a criterion, do not make the change. Do not add marker commits, duplicate tests, fake fixtures, or repeated CI-trigger commits merely to appear to progress.
- Prefer completing and verifying the current mainline over maintaining parallel stale PR work.

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
- Browser E2E #65/#66: GREEN.
- Main Browser E2E workflow: **UPDATED; current-main runtime verification pending**.
- Real-backend Buyer Product Detail: IMPLEMENTED; runtime browser verification pending.
- Authenticated real-backend Buyer end-to-end browser acceptance: OUTSTANDING.
- Authenticated real-backend Seller/Admin browser acceptance: OUTSTANDING.
- Non-Stripe provider adapters/runtime: OUTSTANDING.
- Refund-after-payout accounting policy: OUTSTANDING.
- Final commercial release readiness: NOT CLAIMED.

## Remaining work — priority order
1. **Buyer real-backend browser acceptance — NEXT**
   - Run current-main Browser E2E through the real-backend proxy.
   - Verify Browse loads API products without demo fallback.
   - Verify clicking an API product opens real Product Detail.
   - Verify authenticated session → purchase/order → payment settlement → Library → protected Watch/Download using deterministic data.
   - Reuse existing backend Buyer HTTP E2E setup; do not rebuild existing purchase APIs.
2. **Seller/Admin browser acceptance**
   - Exercise Seller application/product/media/dashboard/earnings/payout flows against the real backend where feasible.
   - Exercise Admin verification/moderation/payout review against the real backend.
3. **Payment provider integration**
   - Verify Checkout HTTP contract coverage for selected `providerId` passthrough.
   - Trace Stripe provider identity from Checkout metadata through webhook/event ledger and `completePayment`.
   - Implement real PayPal, Adyen, Paddle and PayPay adapters or explicitly narrow the supported-provider catalog before release.
4. **Refund / payout accounting integrity**
   - Verify payout eligibility excludes refunded earnings, including after payout creation.
   - Decide/implement recovery/receivable treatment when a previously paid-out earning is later refunded.
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
5. Before editing, identify the exact acceptance criterion being advanced. If no criterion advances, do not make a code change.
6. After every meaningful change, record exact files/commit, verification result, remaining gap, and exact next action in both checkpoint files.
7. Never claim GREEN from implementation alone; require runtime/CI evidence.
8. Never force-update a branch when the SHA has moved. Rebase/merge or create a new safe branch instead.
9. If a previous task description conflicts with current code, current mainline code wins; correct the checkpoint rather than repeating the old task.
10. Never create progress-marker commits, duplicate test implementations, fake catalog data, or repeated no-op CI-trigger changes solely to move the milestone number.

**Exact next starting point:** Run/inspect the current-main Browser E2E after the workflow proxy change. Fix only concrete failures. If GREEN, move directly to authenticated Buyer/Seller/Admin acceptance; then provider consistency, refund/payout accounting, and final release hardening.

**These files and the latest repository state are the authoritative continuation source.**
