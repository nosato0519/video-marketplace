# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 431 — Buyer Account/Orders UI contract hardening complete; browser/API verification remains the gate before declaring buyer UI accepted.**

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
- `account.html` buyer account hub is implemented.
- `orders.html` standalone authenticated buyer order-history page is implemented.
- **New:** `account.html` was hardened to tolerate the canonical order response as either an array or an object containing `items`/`orders`, and to recognize the current product/date field variants without trusting client user IDs.

### Verification status
- Latest known PostgreSQL acceptance run (#87) is green, including seller profile/earnings/payout E2E.
- Seller browser-level acceptance has not been executed in this environment.
- Buyer Account and Orders UI have not yet been browser-verified against real authenticated API responses. Do not claim buyer UI acceptance is green.

## Remaining work — priority order
### 1. Browser/UI verification
- Execute Seller browser smoke in an actual authenticated seller session.
- Execute unauthorized/non-seller boundary mode.
- Verify Seller Dashboard profile, verification, earnings, payout and product navigation.
- Verify buyer Account page with real authenticated `/api/orders` and `/api/library` responses.
- Verify buyer Orders page with real authenticated `/api/orders` records.
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
**Browser-verify the buyer Account/Orders/Library flow and the pending Seller browser acceptance. Fix only observed contract or UI failures, then re-run CI/acceptance as appropriate.**

## Important technical decisions
- Keep cross-seller resource access at 404 to reduce existence leakage.
- Never claim CI/browser success without a completed, verifiable run.
- Keep seller authorization server-side; UI must not bypass backend authorization.
- Buyer account/order/library pages use same-origin authenticated requests and never trust client-provided user IDs.
- Acceptance fixtures must use the canonical current schema and route contracts.
- Never automatically convert legacy BIGINT purchase data.
- Commit every meaningful milestone and update this state file.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree, and continue from the latest saved state without relying on chat history. After every meaningful milestone, update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**
