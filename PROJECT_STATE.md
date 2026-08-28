# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 430 — Buyer account hub and standalone order-history UI added; browser acceptance and UI/API contract verification remain required.**

## Latest checkpoint — 2026-08-28
### Completed
- Core storefront/catalog foundation is implemented.
- Buyer purchase flow, order history API, Library playback/download authorization, payment/refund/failure handling are implemented.
- Protected media streaming/download routes are implemented.
- Reporting/moderation foundations and admin moderation routes are implemented.
- Seller product/media APIs, product publishing and ownership isolation are implemented.
- Seller profile read/update API is implemented.
- Seller verification submission API is implemented with duplicate/already-verified protection.
- Seller earnings API is seller-scoped and provides summary + recent ledger rows.
- Seller payout API validates currency, available balance and pending payout exposure before creating a payout request.
- Admin payout and seller verification routes are mounted.
- PostgreSQL migration preflight/execution is deterministic and concurrency-safe.
- Legacy BIGINT purchase installs remain deliberately blocked until a reviewed backup/rollback migration plan exists.
- Seller authenticated E2E fixture was corrected to the canonical profile field names, verification route and ledger-backed earnings data, including seller isolation and payout balance protections.
- Seller dashboard UI exists at `seller/dashboard.html` with profile, verification, earnings, payout and payout-history flows.
- Seller product management links to the seller dashboard.
- Seller dashboard browser acceptance checklist and smoke harness exist, including explicit authenticated-seller and unauthorized-boundary modes.
- Seller dashboard auth/error handling was hardened for 401/403 responses.
- **New:** `account.html` added as the buyer account hub, loading authenticated `/api/orders` and `/api/library` data and linking to the storefront, full order history and Library.
- **New:** `orders.html` added as a standalone authenticated buyer order-history page with order/product/amount/currency/status/date display and navigation back to Account/Library/Storefront.
- **New:** `PROJECT_STATE.md` updated to record the buyer UI milestone and the remaining verification work.

### Verification status
- Latest known PostgreSQL acceptance run (#87) is green, including seller profile/earnings/payout E2E.
- Seller browser-level acceptance has not been executed in this environment.
- The newly added buyer Account and Orders pages have not yet been browser-verified against the live API response schema. Do not claim these UI flows are green until tested.

## Remaining work — priority order
### 1. Browser/UI verification
- Execute the Seller browser smoke harness in an actual authenticated seller session.
- Execute the unauthorized/non-seller boundary mode.
- Verify Seller Dashboard profile, verification, earnings, payout and product navigation.
- Verify buyer Account page loads authenticated order/library data.
- Verify buyer Orders page matches the canonical `/api/orders` response fields and displays real records correctly.
- Verify buyer Library watch/download links end-to-end.
- Record concrete failures only; fix and re-run.

### 2. Buyer UI integration
- Add buyer reporting UI where appropriate.
- Confirm purchase → Account → Order History → Library → Watch/Download is usable end-to-end from the UI.
- Add any missing account/profile controls required for the final product.

### 3. Admin UI and moderation acceptance
- Wire admin payout review UI.
- Wire seller verification review UI.
- Wire report processing/takedown UI.
- Add DB-backed acceptance for report processing, takedown and blocked catalog/detail/media access.

### 4. Production hardening
- Complete production authentication/session behavior.
- Privacy/account controls.
- Region restrictions and applicable compliance controls.
- PostgreSQL clean-install verification.
- Payment/provider production compatibility review.
- Security review of authorization, media access, webhook handling, uploads and sensitive operations.

### 5. Legacy data migration
- Do not auto-convert the legacy BIGINT purchase schema.
- Define and review backup/restore, rollback and data-integrity strategy before any BIGINT → UUID migration.

### 6. Commercial release / ZIP
- Clean-install test.
- Backup/restore test.
- Production configuration documentation.
- Licensing and operator documentation.
- Commercial ZIP packaging.
- Final buyer/seller/admin/payment/media/security/install acceptance.

## Exact next step
**Browser-verify the new buyer Account/Orders UI against the canonical API responses, while also executing the pending Seller browser smoke/authorization checks. Fix concrete mismatches before adding more UI.**

## Important technical decisions
- Keep cross-seller resource access at 404 to reduce existence leakage.
- Never claim CI/browser success without a completed, verifiable run.
- Keep seller authorization server-side; UI must not bypass backend authorization.
- Buyer account/order/library pages must use same-origin authenticated requests and must not trust client-provided user IDs.
- Acceptance fixtures must use the canonical current schema and route contracts.
- Never automatically convert legacy BIGINT purchase data.
- Commit every meaningful milestone and update this state file.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree, and continue from the latest saved state without relying on chat history. After every meaningful milestone, update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**
