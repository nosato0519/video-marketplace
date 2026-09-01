# Video Marketplace Project State

## Current milestone
**Milestone 480 — Continuation checkpoint before chat handoff.**

## Latest checkpoint — 2026-09-01
### Authoritative state
- Repository: `nosato0519/video-marketplace`
- Authoritative branch: `main`.
- Stale PR #13 branch: `ci/buyer-real-browser-acceptance`; do not treat it as mainline state.
- PR #13 currently remains OPEN/DRAFT and its head is `44356d44f041791b64e5a17bab661cc219c5ca48`.
- Mainline Browser E2E workflow is already configured to use the existing same-origin Browser Proxy: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173/app/index.html` and `BROWSER_BACKEND_URL=http://127.0.0.1:3000`.
- Playwright owns startup of the browser server through its existing `webServer`; do not add another frontend server.

### Completed / verified previously
- Core storefront/catalog, Buyer purchase/order/Library/watch/download authorization, payment/refund/failure handling.
- Seller product/media, publishing, ownership isolation, profile, verification, earnings and payout UI/API foundations.
- Protected media streaming/download and hardened upload validation.
- Reporting/moderation foundations and Admin moderation/payout/verification routes.
- Buyer Account/Orders/Library pages and Seller Dashboard/Product Flow UI.
- PostgreSQL migration preflight/execution and legacy BIGINT purchase migration block.
- Production configuration, backup/recovery and commercial package documentation.
- Payout-to-earnings allocation ledger and payout-paid settlement wiring.
- PostgreSQL payout row-locking and cancelled-payout allocation fixes.
- Checkout selected `providerId` passthrough.
- Atomic canonical `seller_earnings` creation on successful payment settlement.
- Atomic/idempotent refund reversal and entitlement revocation.
- Backend Regression #644: GREEN.
- Clean Install #229: GREEN.
- PostgreSQL Migration Acceptance #255: GREEN.
- Browser E2E #65/#66: GREEN previously.
- Real HTTP Buyer purchase/media acceptance: IMPLEMENTED.
- Real HTTP Seller product/media acceptance: IMPLEMENTED.
- Real catalog listing and product-detail backend APIs exist.
- Product Detail now consumes the real backend product-detail API and no longer relies on the legacy demo lookup/fallback.
- Main Browser E2E workflow was changed from the Python static server to the existing same-origin proxy.
- Duplicate frontend startup in Backend Browser Acceptance was removed after CI showed port 4173 was already owned by Playwright/browser-server startup.
- Buyer browser acceptance was tightened so the Catalog API must return the seeded real product; API failure/fallback cannot make the gate pass.

### Latest concrete Buyer CI fixes on stale PR #13
- `d42984c24369226151e7e7cc2888286a0a52e2a1`: made Buyer browser test self-contained with CI-safe `DATABASE_URL` before importing backend DB/session modules; corrected teardown ordering so `seller_earnings` is deleted before referenced orders.
- `44356d44f041791b64e5a17bab661cc219c5ca48`: tightened Buyer catalog acceptance to require the real catalog API response and seeded product.
- These PR commits are evidence of the latest Buyer acceptance work, but they are NOT on `main` unless a future merge/implementation explicitly confirms that.

### Current blocker / next verification
- The authoritative current-main Browser E2E runtime result after the workflow proxy change has not been established in this session.
- Do NOT claim Buyer Browser Acceptance GREEN without runtime/CI evidence.
- The available GitHub integration does not provide a workflow-dispatch operation in the current toolset, so do NOT create dummy/no-op commits merely to trigger CI.

## Remaining work — priority order
1. **Current-main Buyer browser runtime gate**
   - Inspect the first authoritative current-main Browser E2E result after the proxy workflow change.
   - If FAIL: fix only the concrete failure.
   - If GREEN: immediately advance to authenticated Buyer/Seller/Admin browser acceptance.
2. **Authenticated Buyer acceptance**
   - Browse → real Product Detail → authenticated session → purchase/order → payment settlement → Library → protected Watch/Download.
   - Reuse existing backend fixtures, APIs, and helpers.
3. **Seller/Admin browser acceptance**
   - Seller application/product/media/dashboard/earnings/payout flows against the real backend.
   - Admin verification/moderation/payout review against the real backend.
4. **Payment provider consistency**
   - Verify provider identity/contract propagation and supported-provider scope.
   - Implement real additional provider adapters or explicitly narrow supported-provider catalog before release.
5. **Refund / payout accounting integrity**
   - Verify refunded earnings cannot become payout-eligible.
   - Decide and implement recovery/receivable treatment for refunds after payout.
6. **Release hardening**
   - Install/upgrade matrix, provider/secrets readiness, backup/restore drill, security review, final browser gate.

## Mandatory no-waste rule
- The user's explicit instruction on 2026-09-01 is authoritative: from this point forward, work must be completed without unnecessary repetition.
- Before every change, identify the exact acceptance criterion it advances.
- If no acceptance criterion advances, do not make the change.
- `main` plus this file and `PROGRESS_LOG.md` are the authoritative continuation source.
- Search current code/history before recreating anything from an old TODO.
- Reuse existing APIs, fixtures, helpers, and infrastructure.
- Never create marker/no-op commits, duplicate tests, fake catalog data, or repeated CI-trigger commits solely to appear to progress.
- Never claim GREEN without runtime/CI evidence.
- Never force-update a moved branch.
- Once a gate is GREEN, move directly to the next gate and do not revisit completed work.

## Exact next starting point for the next chat
**Start by reading this file and `PROGRESS_LOG.md`, inspect the latest `main` SHA, then inspect the authoritative Browser E2E runtime/CI result. Do not rebuild Buyer tests. If the gate is GREEN, move directly to authenticated Buyer/Seller/Admin acceptance. If it is FAIL, fix only the observed failure and record the result.**

**These files and the latest `main` repository state are the authoritative continuation source.**
