# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 434 — Admin moderation console added for authenticated review/report workflows and audited takedowns; browser and DB-backed acceptance remain required.**

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
- Seller browser acceptance checklist and smoke harness exist with authenticated-seller and unauthorized-boundary modes.
- Seller dashboard auth/error handling was hardened for 401/403 responses.
- `account.html` buyer account hub is implemented and reads authenticated orders/library data.
- `orders.html` standalone authenticated buyer order-history page is implemented.
- `account.html` was hardened for the canonical `/api/orders` response shape and current order field names.
- `library.html` has explicit navigation to My Account, Order History and Storefront.
- Admin dashboard overview metrics explicitly show `Not connected` / `Not checked` until authenticated live endpoints and health checks are actually wired.
- **New:** `app/admin/moderation.html` added as an authenticated Admin moderation console consuming `/api/admin/content/reviews`, `/api/admin/content/reports`, status transition endpoints, and content takedown. It handles 401/403 explicitly and requires a takedown reason; review actions surface notes requirements.

### Verification status
- Latest known PostgreSQL acceptance run (#87) is green, including seller profile/earnings/payout E2E.
- Seller browser-level acceptance has not been executed in this environment.
- Buyer Account/Orders/Library UI has not yet been browser-verified against real authenticated API responses.
- Admin moderation console has not yet been browser-verified or DB-accepted end-to-end. Do not claim moderation acceptance is green.

## Remaining work — priority order
### 1. Browser/UI verification
- Execute Seller browser smoke in an actual authenticated seller session.
- Execute unauthorized/non-seller boundary mode.
- Verify Seller Dashboard profile, verification, earnings, payout and product navigation.
- Verify buyer Account page with real authenticated `/api/orders` and `/api/library` responses.
- Verify buyer Orders page with real authenticated `/api/orders` records.
- Verify buyer Library watch/download links end-to-end.
- Verify navigation Account → Orders → Library → Storefront on desktop and mobile widths.
- Verify Admin Moderation page as authenticated admin and verify unauthorized boundary.
- Record concrete failures only; fix and re-run.

### 2. Buyer UI integration
- Add buyer reporting UI where appropriate.
- Confirm purchase → Account → Order History → Library → Watch/Download is usable end-to-end from the UI.
- Add any missing account/profile controls required for the final product.

### 3. Admin UI and moderation acceptance
- Wire authenticated live metrics where backend contracts exist.
- Wire admin payout review UI.
- Wire seller verification review UI.
- Add DB-backed acceptance for report processing, takedown and blocked catalog/detail/media access.
- Link the moderation console into the Admin Dashboard navigation once the exact route convention is verified.

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
**Verify the new Admin Moderation console's route/asset loading and connect it to the existing Admin navigation without guessing the application's routing convention; then perform browser/API acceptance.**

## Important technical decisions
- Keep cross-seller resource access at 404 to reduce existence leakage.
- Never claim CI/browser success without a completed, verifiable run.
- Keep seller authorization server-side; UI must not bypass backend authorization.
- Buyer account/order/library pages use same-origin authenticated requests and never trust client-provided user IDs.
- Admin dashboards must never display placeholder values as real production metrics or health status.
- Moderation UI must rely on server-side Admin authorization and must not infer permission from client state.
- Destructive moderation actions require an explicit reason and are audit-recorded by the backend.
- Acceptance fixtures must use the canonical current schema and route contracts.
- Never automatically convert legacy BIGINT purchase data.
- Commit every meaningful milestone and update this state file.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree, and continue from the latest saved state without relying on chat history. After every meaningful milestone, update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**
