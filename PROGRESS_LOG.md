# Development Progress Log

## 2026-09-03 — Milestone 481 — Release hardening continuation

### Purpose
This checkpoint records the exact state so the next session can continue without repeating investigation or implementation.

### Authoritative state
- Repository: `nosato0519/video-marketplace`
- Authoritative branch: `main`.
- The authoritative continuation files are `PROJECT_STATE.md` and this `PROGRESS_LOG.md`.
- The mainline Playwright/browser-server path is the existing same-origin proxy using `/app/index.html`; do not introduce a second frontend server.
- Latest implementation checkpoint before this documentation update: `b586cda2266ffe6de7daa42d0d550f465e59b7f5`.
- Documentation checkpoint created by the prior release-readiness work: `1ae14343b2aa866487767eb2b48fbbdb15b8bb83`.

### Completed work that must NOT be recreated
- Storefront/catalog and real catalog APIs.
- Buyer purchase/order/Library/watch/download authorization foundations.
- Seller product/media/publishing/profile/verification/earnings/payout foundations.
- Admin verification/moderation/payout foundations.
- Payment/refund/failure handling and seller earning settlement logic.
- Protected media access and upload validation.
- PostgreSQL migration/preflight and existing backend acceptance suites.
- Product Detail real-backend API integration.
- Existing same-origin browser proxy.
- Seller payment-provider settings persistence without credential storage.
- Browser UI Acceptance run `33710004553`: GREEN.
- Backend Regression run `33710004552`: GREEN.
- Clean Install run `33710566953`: GREEN on Node 20/22 matrix.

### Release-hardening verification completed
- Backend Regression `33710004552` completed GREEN after the UUID fixture correction on `b586cda...`.
- Browser UI Acceptance `33710004553` completed GREEN.
- Clean Install `33710566953` completed GREEN on supported Node 20 and Node 22 runtimes.
- Payment-provider identity/contract scope was verified against the actual runtime: Stripe is the implemented live adapter; non-Stripe catalog entries are `adapter_ready` but intentionally return unavailable adapters and cannot perform checkout.
- Seller provider configuration persistence is covered while credentials remain environment-secret based.

### Media storage release-hardening checkpoint
- Existing media reads already use the storage abstraction and local provider.
- The seller upload path previously wrote directly to `MEDIA_STORAGE_DIR`.
- The upload path has now been moved onto the existing storage abstraction: write, bounded-prefix read for signature validation, and cleanup are storage operations.
- The local provider now implements the corresponding write/delete lifecycle with the existing path-confinement protection.
- Existing media storage tests were extended only for the new write/cleanup contract; no duplicate acceptance suite was created.
- The first post-change browser backend run exposed an existing acceptance-test selector mismatch: the UI uses `Log in`, while the test matched only `Login|Sign in`.
- Corrected only that selector in `tests/browser-backend-seller-application.spec.js` (commit `b21fdcac8b6ae83c03f390247490bb7bfeb51959`).
- The corrected commit must be verified by the existing CI gates before the media-storage change is considered GREEN.

### Refund-after-payout boundary
- Existing regression coverage confirms a paid seller earning becomes `refunded` while paid payout history and allocation history remain intact.
- The schema still has no payout reversal/recovery-liability field.
- Do not invent recovery accounting until an explicit business/accounting requirement exists. This is an intentional release policy boundary.

### Important no-waste rule
1. Read `PROJECT_STATE.md` and this log first.
2. Inspect latest `main` before trusting any old branch or PR.
3. Search current code/history before recreating a feature.
4. Every change must advance a concrete acceptance criterion.
5. Reuse existing APIs, fixtures, helpers, and infrastructure.
6. Never create duplicate tests, fake fixtures, marker/no-op commits, or CI-trigger-only commits.
7. Never repeatedly modify CI without a concrete observed failure.
8. Never claim GREEN without runtime/CI evidence.
9. Never force-update a moved branch.
10. Once a gate is GREEN, move immediately to the next gate.

### Exact continuation instruction
**Next session: read `PROJECT_STATE.md` and this log, inspect latest `main`, then verify commit `b21fdcac8b6ae83c03f390247490bb7bfeb51959` through the existing backend/browser gates. If GREEN, move directly to deployment-specific production configuration and real-browser release validation. Do not recreate completed acceptance suites or provider persistence work.**
