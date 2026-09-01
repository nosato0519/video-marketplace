# Video Marketplace Project State

## Current milestone
**Milestone 479 — Real-backend Buyer browser CI self-containment fix.**

## Latest checkpoint — 2026-09-01
### Work completed
- Real-backend Buyer browser acceptance is isolated in `ci/buyer-real-browser-acceptance` / PR #13.
- Browser infrastructure no longer manually starts a second frontend server in Backend Browser Acceptance; Playwright owns the browser server on port 4173.
- Fresh Backend Browser Acceptance #104 reached the real Buyer browser test, proving the previous duplicate-port failure was fixed.
- #104 then failed for a different, concrete reason: `tests/browser-buyer-real-backend.spec.js` imported `getPool()` before `DATABASE_URL` was supplied to the Playwright process.
- The test was made self-contained by setting a CI-safe default `DATABASE_URL` before importing the backend DB/session modules.
- The test cleanup was also corrected to remove `seller_earnings` before deleting orders, preventing the observed foreign-key cleanup errors from being silently ignored.
- Fix commit: `d42984c24369226151e7e7cc2888286a0a52e2a1`.
- No application functionality was recreated or weakened; the change only makes the real-browser acceptance fixture runnable in its own CI process and cleans its own data safely.

### Current verified status
- Backend regression: GREEN (#644 previously verified).
- Clean Install: GREEN (#363 in the current PR cycle).
- PostgreSQL migration acceptance: GREEN (#255 previously verified).
- Real HTTP Buyer purchase/media acceptance: IMPLEMENTED.
- Real HTTP Seller product/media acceptance: IMPLEMENTED.
- Browser E2E #65/#66: GREEN previously.
- Real-backend Buyer browser acceptance: IMPLEMENTED; latest CI is rerunning after the self-contained DB fix.
- Backend Browser Acceptance #104: FAILED at test startup because Playwright process lacked `DATABASE_URL`; FIXED in `d42984c...`.
- Earlier duplicate port startup issue: FIXED and no longer the current failure.
- Seller/Admin real-backend browser acceptance: OUTSTANDING.
- Non-Stripe provider adapters/runtime: OUTSTANDING.
- Refund-after-payout accounting policy: OUTSTANDING.
- Final commercial release readiness: NOT CLAIMED.

## Remaining work — priority order
1. Verify CI after `d42984c24369226151e7e7cc2888286a0a52e2a1`.
2. If Buyer browser acceptance passes, move directly to Seller/Admin real-backend browser acceptance.
3. Complete supported payment-provider integration/contract verification.
4. Complete refund-after-payout accounting policy and tests.
5. Complete security, backup/restore, upgrade matrix, final browser regression, and release gate.

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
10. For Playwright tests that import backend modules, establish required backend environment variables before module import.
11. Do not silently ignore test-fixture cleanup errors when they reveal real FK/order-of-deletion problems; clean dependent records first.

**Exact next starting point:** Inspect the CI triggered by `d42984c24369226151e7e7cc2888286a0a52e2a1`. If Buyer browser acceptance is GREEN, proceed directly to Seller/Admin browser coverage. If it fails, fix only the concrete failure shown by that run.

**These files and the latest repository state are the authoritative continuation source.**
