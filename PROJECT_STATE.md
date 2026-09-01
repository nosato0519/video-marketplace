# Video Marketplace Project State

## Current milestone
**Milestone 478 — Browser acceptance CI infrastructure correction.**

## Latest checkpoint — 2026-09-01
### Work completed
- Real-backend Buyer browser acceptance remains isolated in `ci/buyer-real-browser-acceptance` / PR #13.
- PR #13 head initially triggered Browser E2E, Backend Browser Acceptance, Browser UI Acceptance and Clean Install.
- Clean Install completed GREEN (#363).
- Backend Browser Acceptance #99 exposed a duplicate frontend-server startup: the workflow manually started `scripts/ci-frontend-proxy.mjs` on port 4173, while Playwright's `webServer` also starts `tests/browser-server.js` on the same port.
- Removed the manual `Start frontend` step from `.github/workflows/backend-browser-acceptance.yml` and supplied `PLAYWRIGHT_BASE_URL`, `BROWSER_BACKEND_URL`, `PAYMENT_WEBHOOK_SECRET`, and `BACKEND_URL` to the Playwright step.
- Fix commit: `129ce105c9bb78aeaebd8b0e64c80af77ffcea97`.
- This change is intentionally limited to the observed CI failure; no application/catalog/purchase functionality was recreated.

### Current verified status
- Backend regression: GREEN (#644 previously verified).
- Clean Install: GREEN (#229 previously verified; PR #13 #363 also GREEN).
- PostgreSQL migration acceptance: GREEN (#255 previously verified).
- Real HTTP Buyer purchase/media acceptance: IMPLEMENTED.
- Real HTTP Seller product/media acceptance: IMPLEMENTED.
- Browser E2E #65/#66: GREEN previously.
- Real-backend Buyer browser acceptance: IMPLEMENTED, CI verification in progress.
- Backend Browser Acceptance #99: FAILED due to duplicate port startup; FIXED in `129ce105...`; a new CI run is required for authoritative verification.
- Browser UI Acceptance #94: FAILED in the same PR cycle; requires inspection of its latest failure if it remains red after the infrastructure correction.
- Browser E2E #101: IN PROGRESS at the last check.
- Seller/Admin real-backend browser acceptance: OUTSTANDING.
- Non-Stripe provider adapters/runtime: OUTSTANDING.
- Refund-after-payout accounting policy: OUTSTANDING.
- Final commercial release readiness: NOT CLAIMED.

## Remaining work — priority order
1. Verify the new CI runs after `129ce105`.
2. Complete real-backend Buyer browser acceptance; do not weaken the test to hide failures.
3. Move directly to Seller/Admin real-backend browser acceptance.
4. Complete supported payment-provider integration/contract verification.
5. Complete refund-after-payout accounting policy and tests.
6. Complete security, backup/restore, upgrade matrix, final browser regression, and release gate.

## Anti-duplication / continuation protocol
1. Read this file and `PROGRESS_LOG.md` before every work cycle.
2. Inspect latest `main` before relying on old PRs or TODOs.
3. Search commit history before recreating a feature.
4. Treat current `main` plus these checkpoint files as authoritative.
5. Change code only when it advances a concrete acceptance criterion or fixes an observed failure.
6. Record exact files/commit, verification result, remaining gap, and next action after meaningful changes in both files.
7. Never mark GREEN without runtime/CI evidence.
8. Never force-update a moved branch.
9. Do not reintroduce a second server on port 4173; Playwright's `webServer` owns the browser server.

**Exact next starting point:** Inspect the CI triggered by fix commit `129ce105c9bb78aeaebd8b0e64c80af77ffcea97`. If Backend Browser Acceptance is GREEN, inspect/resolve any remaining Browser UI Acceptance failure, then continue Buyer → Seller/Admin. Do not rebuild existing backend functionality.

**These files and the latest repository state are the authoritative continuation source.**