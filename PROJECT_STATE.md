# Video Marketplace Project State

## Current milestone
**Milestone 458 — Seller payout HTTP acceptance now includes a real concurrent-request regression; runtime/CI verification remains.**

## Latest checkpoint — 2026-08-28
### Completed
- Core storefront/catalog, Buyer purchase/order/Library/watch/download authorization, payment/refund/failure handling.
- Seller product/media, publishing, ownership isolation, profile, verification, earnings and payout UI/API foundations.
- Protected media streaming/download and hardened upload validation with route-level regression tests.
- Reporting/moderation foundations and Admin moderation/payout/verification routes.
- Buyer Account/Orders/Library pages and Seller Dashboard/Product Flow UI.
- Deterministic PostgreSQL migration preflight/execution and legacy BIGINT purchase migration block.
- Admin/Seller/Buyer static contract regressions and confirmed Seller Product Flow + Buyer purchase-flow runs.
- Production configuration, backup/recovery and commercial package documentation.
- Media upload hardening workflow with route-level tests; observed green.
- Confirmed actual migration set: `010_seller_profile.sql` defines `seller_profiles.user_id` as the primary key; `011_seller_earnings.sql` defines `seller_earnings.seller_id -> users.id`; `004_payouts_audit.sql` defines canonical `payouts.seller_id -> users.id` and the payout lifecycle.
- Corrected Seller payout route to use the migrated `payouts` table and `seller_earnings` available balance.
- Corrected Admin payout route to use the same canonical `payouts` / `users.id` schema. Admin listing reads `p.amount`/`p.paid_at`, and status transitions update `reviewed_by`/`reviewed_at`/`paid_at` using columns present in the payout migration.
- Added source-level payout contract regression coverage against the real migrations.
- Extended `backend/scripts/http-seller-profile-earnings-payout-e2e-acceptance.js` to cover Admin authentication, Admin payout listing, requested -> reviewing -> approved -> processing -> paid transitions, invalid terminal transition rejection, audit retrieval, and Seller-side persistence of the final paid state.
- Confirmed `.github/workflows/postgres-migration-acceptance.yml` runs the payout HTTP acceptance script after a fresh PostgreSQL migration and a second idempotent migration pass.
- Hardened Seller payout creation with an explicit PostgreSQL transaction and `pg_advisory_xact_lock` keyed by seller/currency, preventing concurrent payout requests from racing through the available-balance check and both being accepted.
- Added a concurrent HTTP acceptance case to the Seller Profile/Earnings/Payout E2E: two simultaneous 2,500 JPY payout requests with only 3,500 JPY withdrawable after the first 1,000 JPY request must produce exactly one `201` and one `409 amount_exceeds_withdrawable_balance`.

### Verification status
- Latest known PostgreSQL acceptance run (#101) is green, but it predates the latest payout lifecycle extension and concurrency hardening.
- Admin, Buyer and Seller static regressions are green; Seller Product Flow (#3) and Buyer purchase flow (#1) are confirmed green.
- Media upload hardening workflow was updated to include route-level tests and was observed green.
- Seller and Admin payout routes now match the actual migration schema at source level.
- The extended payout HTTP acceptance script, including concurrency coverage, is wired into CI, but GitHub currently reports no workflow run associated with the latest payout commits and the latest commit status has no checks. Do not claim payout runtime acceptance green.
- Seller, Buyer and Admin browser-level acceptance is NOT complete. Do not claim runtime/browser acceptance green.

## Canonical seller/payout model
- Seller identity remains `users.id` for commerce, earnings and payout records.
- `seller_profiles.user_id -> users.id` is the seller-specific profile/onboarding relation; `seller_profiles` has no `id` or `status` column in the actual migration.
- `seller_earnings.seller_id -> users.id`.
- `payouts.seller_id -> users.id`.
- Available balance source: `seller_earnings` rows with `status = 'available'`.
- Payout lifecycle: requested -> reviewing -> approved -> processing -> paid, with failed/cancelled branches.
- `audit_events` records payout status transitions.
- Do not introduce `seller_payout_requests` or `seller_profiles.id` merely to satisfy stale route code; the real migration set is authoritative.

## Release blocker status
**BLOCKED:** Source-level payout contracts, lifecycle acceptance code, and concurrency protection are implemented. Remaining blocker is empirical verification: obtain a CI run for the latest changes, prove fresh migration installation, existing-install migration expectations, and end-to-end audit behavior.

## Remaining work — priority order
1. **Payout runtime + clean-install verification — BLOCKER**
   - Obtain/execute the PostgreSQL acceptance workflow for the latest payout changes.
   - Verify audit events, available-balance calculations, and concurrent-request behavior.
   - Verify fresh migration installation and existing-install migration expectations.
2. **Admin integration**
   - Live metrics against verified canonical tables.
   - Admin payout review UI.
   - Seller verification review UI.
   - DB-backed moderation/takedown acceptance.
3. **Browser E2E**
   - Seller authenticated/unauthorized flows.
   - Buyer Product -> Order -> Checkout -> Account -> Orders -> Library -> Watch/Download.
   - Admin dashboard/moderation authenticated and unauthorized flows.
4. **Production hardening**
   - Production session/auth behavior, privacy/account controls, region/compliance controls, provider compatibility, security review.
5. **Clean install / restore**
   - PostgreSQL clean install and backup/restore verification.
6. **Commercial release**
   - License/operator docs, final ZIP, final buyer/seller/admin/payment/media/security/install acceptance.

## Exact next step
**Get a real CI execution for the latest payout changes. If it is unavailable through the connected GitHub controls, continue source-level verification only and do not mark Payout Green.**

## Continuation rule
At the start of every development session, read this file first, inspect latest commits and repository tree, and continue from the latest saved state. After every meaningful milestone, update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**This file and the latest repository state are the authoritative continuation source.**