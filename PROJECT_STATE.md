# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 448 — Media upload signature validation helper and unit coverage added; route integration remains intentionally pending.**

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
- Seller authenticated E2E fixture was corrected to the canonical profile fields, verification route and ledger-backed earnings data, including seller isolation and payout balance protections.
- Seller dashboard UI exists at `seller/dashboard.html` with profile, verification, earnings, payout and payout-history flows.
- Seller product management links to the seller dashboard.
- Seller dashboard auth/error handling was hardened for 401/403 responses.
- `account.html` buyer account hub is implemented and reads authenticated orders/library data.
- `orders.html` standalone authenticated buyer order-history page is implemented.
- `account.html` was hardened for the canonical `/api/orders` response shape and current order field names.
- `library.html` has explicit navigation to My Account, Order History and Storefront.
- Admin dashboard overview metrics explicitly show `Not connected` / `Not checked` until authenticated live endpoints and health checks are actually wired.
- `app/admin/moderation.html` is implemented as an authenticated Admin moderation console consuming review/report/takedown APIs.
- `admin/index.html` is the public Admin entrypoint with hash dispatch.
- `app/admin/admin-dashboard.html` is the HTML entrypoint for the existing `admin-dashboard.js` renderer.
- `tests/admin-static-entrypoint.test.js` checks the public Admin entrypoint, dashboard renderer entrypoint, moderation API paths, takedown path, and explicit 401/403 handling without requiring credentials or a running database.
- `.github/workflows/admin-static-regression.yml` runs the Admin static entrypoint contract test on changes to Admin/static test files.
- Seller dashboard static contract test and `.github/workflows/seller-static-regression.yml` have been added.
- `tests/buyer-account-static.test.js` checks authenticated Account/Orders/Library API wiring, account navigation, and Library stream/download links.
- `.github/workflows/buyer-static-regression.yml` runs the Buyer Account/Orders/Library static contract test on relevant changes.
- Buyer static contract assertions were corrected to match the actual whitespace/quote style and the actual Account/Orders/Library API contracts.
- `tests/seller-product-flow-static.test.js` checks Seller product listing/editor API wiring, private media upload, product media attachment, publishing/unpublishing controls, same-origin authentication, upload-size guard, and server-side publishing validation messaging.
- `.github/workflows/seller-product-flow-static-regression.yml` runs the Seller product flow static contract test on relevant changes.
- Seller Product Flow Static Regression has a confirmed successful run.
- `tests/buyer-purchase-flow-static.test.js` checks Product → Order → Checkout wiring and authenticated Buyer Order History/Library navigation plus protected Watch/Download links and 401 handling.
- `.github/workflows/buyer-purchase-flow-static-regression.yml` runs the Buyer purchase flow static contract test on relevant changes, with a confirmed successful run.
- Browser acceptance checklist is stored in `tests/browser-acceptance-checklist.md` and explicitly requires actual browser evidence.
- Media stream/download routes require authentication and protected-media authorization, use private/no-store caching, and support range requests.
- Media upload currently enforces seller authorization, allowed MIME types, upload-size limits, safe storage-key construction, and cleanup on failure.
- **New:** `backend/src/media/media-upload-validation.js` provides lightweight magic-byte signature checks for supported MP4/WebM/Matroska media.
- **New:** `backend/src/media/media-upload-validation.test.js` covers valid/invalid MP4 signatures, WebM/Matroska EBML signatures, and required signature lengths.

### Verification status
- Latest known PostgreSQL acceptance run (#101) is green, including buyer purchase/report and seller profile/earnings/payout E2E.
- Admin static regression has a confirmed successful run.
- Buyer static regression has a confirmed successful run (#2).
- Seller static regression has a confirmed successful run.
- Seller product-flow static regression has a confirmed successful run (#3).
- Buyer purchase-flow static regression has a confirmed successful run (#1).
- The new media signature-validation unit tests have been added but their CI result has not yet been verified.
- Seller browser-level acceptance has not been executed in this environment.
- Buyer Product → Order → Checkout → Library UI has not yet been browser-verified against real authenticated/payment responses.
- Admin moderation and Admin dashboard entrypoints have not yet been browser-verified or DB-accepted end-to-end. Do not claim Admin UI acceptance is green.

## Remaining work — priority order
### 1. Media upload hardening
- Decide and implement safe route integration of media signature validation without buffering multi-GB uploads in memory.
- Consider a bounded prefix inspection stream or storage-side verification before marking an asset `ready`.
- Add route-level tests proving mismatched file bodies are rejected and temporary files are removed.

### 2. Browser/UI verification
- Execute Seller browser smoke in an actual authenticated seller session.
- Execute unauthorized/non-seller boundary mode.
- Verify Seller Dashboard profile, verification, earnings, payout and product navigation.
- Verify Seller Products → New product → Save → Upload video → Attach media → Publish/Unpublish.
- Verify buyer Product → Buy now → Order creation → Checkout redirect with real authenticated/payment responses.
- Verify buyer Account page with real authenticated `/api/orders` and `/api/library` responses.
- Verify buyer Orders page with real authenticated `/api/orders` records.
- Verify buyer Library watch/download links end-to-end after purchase.
- Verify navigation Account → Orders → Library → Storefront on desktop and mobile widths.
- Verify `/admin/#/admin` loads `app/admin/admin-dashboard.html`.
- Verify `/admin/#/admin/moderation` loads `app/admin/moderation.html` and its authenticated API calls.
- Verify Admin Moderation page as authenticated admin and verify unauthorized boundary.
- Record concrete failures only; fix and re-run.

### 3. Buyer UI integration
- Add buyer reporting UI where appropriate.
- Confirm purchase → Account → Order History → Library → Watch/Download is usable end-to-end from the UI.
- Add any missing account/profile controls required for the final product.

### 4. Admin UI and moderation acceptance
- Wire authenticated live metrics where backend contracts exist.
- Wire admin payout review UI.
- Wire seller verification review UI.
- Add DB-backed acceptance for report processing, takedown and blocked catalog/detail/media access.
- Connect remaining Admin navigation sections only when their actual screens exist.

### 5. Production hardening
- Complete production authentication/session behavior.
- Privacy/account controls.
- Region restrictions and applicable compliance controls.
- PostgreSQL clean-install verification.
- Payment/provider production compatibility review.
- Security review of authorization, media access, webhook handling, uploads and sensitive operations.

### 6. Legacy data migration
- Do not auto-convert the legacy BIGINT purchase schema.
- Define and review backup/restore, rollback and data-integrity strategy before any BIGINT → UUID migration.

### 7. Commercial release / ZIP
- Clean-install test.
- Backup/restore test.
- Licensing and operator documentation.
- Commercial ZIP packaging.
- Final buyer/seller/admin/payment/media/security/install acceptance.

## Exact next step
**Integrate bounded media signature inspection into the upload path without buffering the full file, add route-level mismatch/cleanup tests, then verify CI.**

## Important technical decisions
- Keep cross-seller resource access at 404 to reduce existence leakage.
- Never claim CI/browser success without a completed, verifiable run.
- Keep seller authorization server-side; UI must not bypass backend authorization.
- Buyer account/order/library pages use same-origin authenticated requests and never trust client-provided user IDs.
- Admin dashboards must never display placeholder values as real production metrics or health status.
- Moderation UI must rely on server-side Admin authorization and must not infer permission from client state.
- Destructive moderation actions require an explicit reason and are audit-recorded by the backend.
- Static contract tests may validate wiring without claiming runtime/browser success.
- Acceptance fixtures must use the canonical current schema and route contracts.
- Never automatically convert legacy BIGINT purchase data.
- Do not buffer multi-GB media uploads in memory for signature validation.
- Do not mark media `ready` until the upload integrity checks required by policy have completed.
- Commit every meaningful milestone and update this state file.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree, and continue from the latest saved state without relying on chat history. After every meaningful milestone, update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**
