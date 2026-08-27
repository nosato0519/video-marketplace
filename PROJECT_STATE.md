# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 426 — Seller dashboard UI is wired to the authenticated profile, verification, earnings and payout APIs; work is paused at a clean checkpoint before CI/browser verification.**

## End-of-day checkpoint — 2026-08-27
This checkpoint is intentionally saved so the next development session can resume without relying on chat history.

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
- Seller authenticated E2E fixture was corrected to use the canonical profile field names, canonical verification route and ledger-backed earnings data; the fixture also covers seller isolation and payout balance protections.
- **New today:** `seller/dashboard.html` was added. It provides authenticated seller profile editing, verification submission, earnings summary/detail, payout request and payout history UI.
- **New today:** `seller/products.html` now links to the seller dashboard.
- `PROJECT_STATE.md` has been updated after the latest meaningful milestone.

### Verification status
- The previous verifiable PostgreSQL acceptance run reached all prior acceptance tests successfully.
- The seller profile/earnings/payout E2E had previously been the only failing acceptance test because its fixture used an outdated API contract.
- That fixture has been corrected, but **a new CI run has not yet been verified** after the correction.
- Therefore do **not** claim the corrected seller E2E is green yet.

## Remaining work — priority order
### 1. CI gate
- Run the corrected seller profile/earnings/payout acceptance test.
- Inspect the actual CI result.
- Fix only concrete failures.
- Re-run until the acceptance is verifiably green.

### 2. Seller browser acceptance
- Test authenticated seller dashboard in a real browser flow.
- Verify profile save → verification submission → earnings display → payout request → payout history.
- Verify seller product management → dashboard navigation.
- Verify unauthorized/non-seller access remains blocked.

### 3. Buyer UI integration
- Add/wire buyer account/profile UI.
- Add order-history UI.
- Add reporting UI where appropriate.
- Confirm purchase → Library → Watch/Download is usable end-to-end from the UI.

### 4. Admin UI and moderation acceptance
- Wire admin payout review UI.
- Wire seller verification review UI.
- Wire report processing/takedown UI.
- Add DB-backed acceptance for report processing, takedown and blocked catalog/detail/media access.

### 5. Production hardening
- Complete production authentication/session behavior.
- Privacy/account controls.
- Region restrictions and applicable compliance controls.
- PostgreSQL acceptance/clean-install verification.
- Payment/provider production compatibility review.
- Security review of authorization, media access, webhook handling, uploads and sensitive operations.

### 6. Legacy data migration
- Do **not** auto-convert the legacy BIGINT purchase schema.
- First define and review backup/restore, rollback and data-integrity strategy.
- Only then design and test BIGINT → UUID migration.

### 7. Commercial release / ZIP
- Clean-install test.
- Backup/restore test.
- Production configuration documentation.
- Licensing and operator documentation.
- Commercial ZIP packaging.
- Final acceptance checklist covering buyer, seller, admin, payment, media, security and installation.

## Tomorrow's exact first step
**Start by reading this file, inspecting the latest commits, then verify the corrected seller profile/earnings/payout CI result. Do not skip the CI gate and do not move to browser acceptance until the result is actually green.**

## Important technical decisions
- Keep cross-seller resource access at 404 to reduce existence leakage.
- Never claim CI success without a completed, verifiable run.
- Keep seller authorization server-side; UI must not bypass backend authorization.
- Acceptance fixtures must use the canonical current schema and route contracts rather than legacy assumptions.
- Never automatically convert legacy BIGINT purchase data.
- Commit every meaningful milestone and update this state file so future sessions can continue from the repository state.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**
