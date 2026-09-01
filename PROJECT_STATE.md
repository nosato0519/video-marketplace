# Video Marketplace Project State

## Current milestone
**Milestone 481 — Continuation checkpoint before chat handoff.**

## Latest checkpoint — 2026-09-01
### Authoritative state
- Repository: `nosato0519/video-marketplace`
- Authoritative branch: `main`.
- Stale PR #13 branch: `ci/buyer-real-browser-acceptance`; do not treat it as mainline state.
- Mainline Browser E2E uses the existing same-origin Browser Proxy at `/app/index.html`; Playwright owns browser-server startup. Do not add a second frontend server.

### Completed / verified previously
- Core storefront/catalog, Buyer purchase/order/Library/watch/download authorization, payment/refund/failure handling.
- Seller product/media, publishing, ownership isolation, profile, verification, earnings and payout foundations.
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
- Product Detail consumes the real backend product-detail API and no longer relies on legacy demo lookup/fallback.
- Main Browser E2E workflow uses the existing same-origin proxy.
- Duplicate frontend startup in Backend Browser Acceptance was removed after the port-4173 conflict was diagnosed.

### Buyer real-browser acceptance work
- The existing real-backend Buyer browser acceptance test was recovered from stale acceptance work rather than recreated conceptually.
- A continuation branch based on current main added `tests/browser-buyer-real-backend.spec.js` in commit `d7618f01909b9e56cd66a5777a0fb0dd84aa3df0`.
- The test covers real catalog listing, Product Detail, authenticated buyer session, order creation, payment webhook settlement, Library, protected Watch, and protected Download.
- It is **not yet proven GREEN against authoritative current main**. Do not claim GREEN without runtime/CI evidence.

### Corrections made during the latest work cycle
- Do not create more marker/checkpoint commits, duplicate tests, fake fixtures, or dummy CI-trigger commits.
- Do not keep changing Playwright URL/baseURL configuration unless an observed runtime failure requires it.
- Exploratory branches created during the latest cycle are not authoritative. Do not force-update `main` or switch `main` to an exploratory branch.
- `PROGRESS_LOG.md` was updated in commit `1dc9f892e90554ce90adcf9394bcb046274034ea` to preserve the exact continuation state.

### Current blocker
The authoritative current-main Browser E2E / real-backend Buyer runtime result still needs to be established. The available GitHub integration does not expose workflow dispatch. Do not manufacture a CI run with a no-op commit.

## Remaining work — exact order
1. Inspect authoritative current-main Browser E2E runtime/CI result.
2. If FAIL, fix only the concrete observed failure and record it.
3. If GREEN, immediately verify authenticated Buyer flow end-to-end using existing APIs/fixtures/test.
4. Move directly to Seller/Admin real-backend browser acceptance.
5. Verify payment-provider identity/contract consistency and supported-provider scope.
6. Verify refund-after-payout accounting integrity and runtime coverage.
7. Perform final release hardening: install/upgrade matrix, provider/secrets readiness, backup/restore, security review, final browser regression and release gate.
8. Only after those gates pass, proceed to the requested demo-screen operation.

## Mandatory no-waste rule
- The user's explicit instruction on 2026-09-01 is authoritative: work must proceed without unnecessary repetition.
- Before every change, identify the exact acceptance criterion it advances.
- If no acceptance criterion advances, do not make the change.
- `main` plus this file and `PROGRESS_LOG.md` are the authoritative continuation source.
- Search current code/history before recreating anything from an old TODO.
- Reuse existing APIs, fixtures, helpers, and infrastructure.
- Never create duplicate tests, fake fixtures, marker/no-op commits, or CI-trigger-only commits.
- Never repeatedly modify CI without a concrete observed failure.
- Never claim GREEN without runtime/CI evidence.
- Never force-update a moved branch.
- Once a gate is GREEN, move directly to the next gate.

## Exact next starting point for the next chat
**Read this file and `PROGRESS_LOG.md`, inspect the latest `main` SHA, then inspect the authoritative Browser E2E runtime/CI result. Do not rebuild Buyer tests. If the gate is GREEN, move directly to authenticated Buyer/Seller/Admin acceptance. If it FAILs, fix only the observed failure and record the result.**

**These files and the latest `main` repository state are the authoritative continuation source.**
