# Development Progress Log

## 2026-09-03 — Milestone 484 — Functional demo verification gate

### Demo hardening completed
- Added `demo/verify.mjs`, an isolated end-to-end verifier for the real functional demo backend.
- The verifier checks: health/page serving, catalog state, unauthorized media rejection, buyer purchase → paid order → active entitlement → protected watch → protected download, seller login → product creation → media lifecycle → payout request, and admin login → moderation approval → seller approval.
- Added `npm run verify` to `demo/package.json`.
- Added the reusable `Demo Functional Regression` workflow definition and documented the verification command in `demo/LAUNCH.md`.
- Hardened verifier session-cookie handling for Node's `getSetCookie()` API with a fallback.

### Verification work in progress
- A temporary PR #17 was created solely to execute the verifier through the existing GitHub Actions environment without altering the authoritative mainline product behavior.
- Its Backend Regression run `33723997514` is currently executing and includes the new `Run functional sales demo verifier` step.
- Do not mark the demo verifier GREEN until that step completes successfully.

### Authoritative mainline
- Branch: `main`.
- Existing verified implementation checkpoint remains `581cc444063bbecbbafd4cb62e51ab82bfc08d73`.
- Demo additions on main are subsequent hardening/documentation changes; they do not replace the verified core implementation.

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
- Media upload write/delete lifecycle through the storage abstraction.
- Graceful HTTP server and PostgreSQL pool shutdown handling.

### Release gate status
- Core automated implementation/release-hardening gates were previously GREEN on the verified checkpoint.
- The new demo-specific verifier is an additional gate and is intentionally not called GREEN until its actual CI result is observed.
- A public demo URL still requires a running execution environment; GitHub Codespaces forwards the configured port for browser access when a Codespace is running.

### No-waste rule
- Do not recreate completed feature or acceptance work.
- Do not call the product 100% complete solely because code exists.
- Do not claim demo verification success without an observed successful verifier result.
- Do not configure production hosting or credentials without an explicit authorized provider choice.
