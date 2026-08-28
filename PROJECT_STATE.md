# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 427 — Seller dashboard browser-acceptance preparation and auth/error hardening complete; actual browser execution remains the next verification gate.**

## Latest checkpoint — 2026-08-28
### Completed
- Core storefront/catalog foundation is implemented.
- Buyer purchase flow, order history, Library playback/download authorization, payment/refund/failure handling are implemented.
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
- Added `backend/scripts/seller-dashboard-browser-acceptance.md` with the browser-level acceptance flow and authorization checks.
- **New:** Hardened seller dashboard API error handling so 401/403 responses produce an explicit seller-authentication/permission message instead of exposing raw backend status text; API calls remain same-origin with credentials.

### Verification status
- The latest known PostgreSQL acceptance run (#87) was verified green, including seller profile/earnings/payout E2E.
- Browser-level acceptance has **not** been executed in this environment yet. Do not claim browser acceptance is green.

## Remaining work — priority order
### 1. Seller browser acceptance
- Execute the browser checklist against an authenticated test seller.
- Verify dashboard load, profile persistence, verification submission/duplicate rejection, earnings display, payout success/failure, product navigation and authorization boundaries.
- Record concrete failures only; fix and re-run.

### 2. Buyer UI integration
- Add/wire buyer account/profile UI.
- Add order-history UI.
- Add reporting UI where appropriate.
- Confirm purchase → Library → Watch/Download is usable end-to-end from the UI.

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
- Do **not** auto-convert the legacy BIGINT purchase schema.
- Define and review backup/restore, rollback and data-integrity strategy before any BIGINT → UUID migration.

### 6. Commercial release / ZIP
- Clean-install test.
- Backup/restore test.
- Production configuration documentation.
- Licensing and operator documentation.
- Commercial ZIP packaging.
- Final buyer/seller/admin/payment/media/security/install acceptance.

## Exact next step
**Run the Seller browser acceptance flow in an actual browser/test session. Do not mark it passed based on code inspection alone.**

## Important technical decisions
- Keep cross-seller resource access at 404 to reduce existence leakage.
- Never claim CI/browser success without a completed, verifiable run.
- Keep seller authorization server-side; UI must not bypass backend authorization.
- Acceptance fixtures must use the canonical current schema and route contracts.
- Never automatically convert legacy BIGINT purchase data.
- Commit every meaningful milestone and update this state file.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**
