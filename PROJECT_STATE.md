# Video Marketplace Project State

## Current milestone
**Milestone 477 — Real-backend Buyer browser acceptance staged for authoritative CI verification.**

## Latest checkpoint — 2026-09-01
### Work completed in this milestone
- Created isolated branch `ci/buyer-real-browser-acceptance` from the authoritative current `main`.
- Added `tests/browser-buyer-real-backend.spec.js` with deterministic PostgreSQL fixtures, a real buyer session cookie, real catalog/product navigation, real order creation through the UI, mock-provider webhook settlement, Library verification, protected Watch verification, and protected Download verification.
- Reused the existing backend purchase/media implementation rather than recreating purchase APIs.
- Updated `.github/workflows/browser-e2e.yml` on the isolated branch so Playwright's existing `tests/browser-server.js` owns port 4173 and proxies `/api/*` to the real backend at port 3000; removed the conflicting plain Python static server path.
- Added `PAYMENT_WEBHOOK_SECRET` to the browser acceptance CI environment so the deterministic settlement step can sign the test webhook.
- Opened draft PR #13 for isolated CI verification; no merge has been attempted.
- CI runs triggered for the PR head: Backend Browser Acceptance #96, Browser UI Acceptance #91, Browser E2E #98, Clean Install #360 are currently queued.

### Important cleanup / safety correction
- An unverified Buyer browser draft was briefly created on `main` during tool operation, then explicitly deleted before the isolated branch was created. Temporary anchor files were also deleted. The authoritative mainline has no Buyer browser draft from that attempt.
- No force-update was used.
- No feature is being marked GREEN until CI runtime evidence is available.

### Current verified status
- Backend regression: GREEN (#644).
- Clean install: GREEN (#229 previously verified; #360 newly queued on PR #13).
- PostgreSQL migration acceptance: GREEN (#255).
- Real HTTP Buyer purchase/media acceptance: IMPLEMENTED.
- Real HTTP Seller product/media acceptance: IMPLEMENTED.
- Browser proxy to real backend: IMPLEMENTED and used by the isolated branch workflow.
- Browser E2E #65/#66: GREEN (previously verified).
- Product Detail real API path: IMPLEMENTED; isolated real-browser verification is now staged.
- Real-backend Buyer browser acceptance: IMPLEMENTED in PR #13, CI VERIFICATION PENDING.
- Seller/Admin real-backend browser acceptance: OUTSTANDING.
- Non-Stripe provider adapters/runtime: OUTSTANDING.
- Refund-after-payout accounting policy: OUTSTANDING.
- Final commercial release readiness: NOT CLAIMED.

## Remaining work — priority order
1. **Buyer real-backend browser acceptance — CURRENT**
   - Wait for PR #13 CI and inspect failures only if they occur.
   - If GREEN, promote the acceptance coverage appropriately and move to Seller/Admin browser acceptance.
2. **Seller/Admin browser acceptance**
3. **Payment provider integration**
4. **Refund / payout accounting integrity**
5. **Release hardening and final security/E2E gate**

## Anti-duplication / continuation protocol
1. Read `PROJECT_STATE.md` and `PROGRESS_LOG.md` before every work cycle.
2. Inspect the latest `main` before relying on old PRs or TODOs.
3. Search commit history before recreating a feature.
4. Treat current `main` plus these checkpoint files as authoritative.
5. Make a code change only when it advances a concrete acceptance criterion.
6. After meaningful changes, record exact files/commit, verification result, remaining gap, and next action in both checkpoint files.
7. Never call an implementation GREEN without runtime/CI evidence.
8. Never force-update a moved branch.
9. If an old task description conflicts with current code, current mainline code wins.

**Exact next starting point:** Inspect PR #13 CI results. Do not recreate catalog/product/purchase functionality. If Buyer browser CI fails, fix only the observed failure; if it passes, move directly to Seller/Admin real-backend browser acceptance.

**These files and the latest repository state are the authoritative continuation source.**
