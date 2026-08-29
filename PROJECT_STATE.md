# Video Marketplace Project State

## Current milestone
**Milestone 465 — Payout-to-earnings allocation ledger, payout-paid settlement wiring, and expanded payout settlement acceptance coverage. Fresh CI verification remains.**

## Latest checkpoint — 2026-08-29
### Completed
- Core storefront/catalog, Buyer purchase/order/Library/watch/download authorization, payment/refund/failure handling.
- Seller product/media, publishing, ownership isolation, profile, verification, earnings and payout UI/API foundations.
- Protected media streaming/download and hardened upload validation with route-level regression tests.
- Reporting/moderation foundations and Admin moderation/payout/verification routes.
- Buyer Account/Orders/Library pages and Seller Dashboard/Product Flow UI.
- Deterministic PostgreSQL migration preflight/execution and legacy BIGINT purchase migration block.
- Admin/Seller/Buyer static contract regressions and confirmed Seller Product Flow + Buyer purchase-flow runs.
- Production configuration, backup/recovery and commercial package documentation.
- Confirmed canonical payout schema: `payouts.seller_id -> users.id`; available balance comes from `seller_earnings` rows with `status = 'available'`.
- Seller payout creation uses an explicit PostgreSQL transaction and `pg_advisory_xact_lock` keyed by seller/currency.
- Admin payout lifecycle is transactional with row locking and audit-event insertion.
- Corrected payout acceptance concurrency coverage and 1,000 JPY minimum payout policy remain implemented.
- Checkout route passes selected `providerId` through to provider routing.
- Successful payment settlement creates exactly one canonical `seller_earnings` row in the same transaction as payment/order settlement.
- Refund settlement marks the matching seller earning `refunded` and records `refunded_at` atomically with order refund and entitlement revocation.
- Refund acceptance coverage verifies earning creation, refund reversal, zero available balance, and duplicate refund idempotency.
- Added `backend/migrations/012_payout_earnings_allocations.sql` defining `payout_earnings_allocations` so each payout records exact earnings provenance and supports partial/multi-earning payouts.
- Seller payout creation allocates requested amount across available earnings inside the same transaction and fails atomically if allocation cannot cover the request.
- Added `backend/src/seller/payout-earnings-settlement.js`; an earning becomes `paid` only when cumulative allocations from paid payouts cover its full `net_amount`, while partial allocations remain available.
- Wired the payout-paid settlement helper into Admin `processing -> paid` transition inside the existing `withTransaction()` transaction.
- Expanded `backend/scripts/http-seller-profile-earnings-payout-e2e-acceptance.js` to verify payout allocation provenance, partial paid payout leaves the earning `available`, cancelled payout does not consume withdrawable balance, and a later full payout changes the earning to `paid` only after total paid allocations reach `net_amount`.
- **2026-08-29:** Fresh Backend Regression run `33258384757` executed against commit `cff6f454ee04d16424bf0af33968e38312ba6d51`. All prior steps through payment/refund acceptance and the 187 unit tests passed. The seller earnings/payout E2E failed at payout creation because PostgreSQL rejects `FOR UPDATE OF e` on the grouped aggregate query (`SQLSTATE 0A000`).
- **2026-08-29:** Root cause identified in `backend/src/seller/payout-routes.js`: allocation query used `GROUP BY ... FOR UPDATE OF e`. Fix committed as `36ad9257a3400566f655dcfe13d270fa885a7d36`: aggregate first, then explicitly `SELECT id FROM seller_earnings WHERE id = $1 FOR UPDATE` before inserting each allocation.

### Verification status
- Fresh regression infrastructure, migrations, 187 unit tests, authentication, payment webhook, payment failure, payment refund, buyer purchase, seller application, and seller product-media acceptance all passed in run `33258384757`.
- **Payout settlement acceptance is NOT green yet.** Run `33258384757` failed specifically at `http-seller-profile-earnings-payout-e2e` with PostgreSQL `FOR UPDATE is not allowed with GROUP BY clause`.
- The exact SQL failure was fixed in commit `36ad9257a3400566f655dcfe13d270fa885a7d36`; a fresh CI run against that fix is still required.
- Refund acceptance has passed in the failed run, but dedicated refund-to-earnings runtime status should still be tracked separately from overall regression.
- Payout concurrency/minimum-payout and full/partial/cancelled settlement are implemented but require a fresh green runtime run after the SQL fix.
- Checkout provider routing source-level gap is fixed; dedicated HTTP contract coverage remains outstanding.
- Stripe webhook provider consistency through the complete runtime path remains to be verified.
- Seller, Buyer and Admin browser-level acceptance remains incomplete.
- Do not claim full release readiness yet.

## Release blocker status
**BLOCKED:** Fresh CI evidence after the payout SQL fix, refund/payout edge-case verification, fresh/existing-install migration verification, real non-Stripe provider adapters, provider end-to-end runtime verification, and authenticated Seller/Buyer/Admin browser E2E remain outstanding.

## Remaining work — priority order
1. **Fresh CI after payout SQL fix — CURRENT**
   - Run/inspect CI for commit `36ad9257a3400566f655dcfe13d270fa885a7d36`.
   - Confirm `http-seller-profile-earnings-payout-e2e` passes all allocation/settlement assertions.
   - If it fails, fix the exact runtime failure and rerun.
2. **Refund / seller earnings integrity**
   - Verify payout eligibility excludes refunded earnings, including after a payout has already been created.
   - Decide/implement accounting treatment for refunds after an earning has already been paid out (platform/seller receivable or equivalent ledger adjustment) before commercial release.
3. **Payment provider integration**
   - Add/verify HTTP Checkout contract coverage for `providerId` passthrough.
   - Trace provider consistency from Checkout metadata through webhook/event ledger and `completePayment`.
   - Implement real PayPal, Adyen, Paddle and PayPay adapters or explicitly narrow the supported-provider catalog before release.
4. **Admin integration**
   - Live metrics against verified canonical tables.
   - Admin payout review UI.
   - Seller verification review UI.
   - DB-backed moderation/takedown acceptance.
5. **Browser E2E**
   - Authenticated Buyer, Seller, and Admin browser flows.
6. **Release hardening**
   - Fresh install and existing-install upgrade matrix.
   - Production secrets/provider readiness checks.
   - Backup/restore drill with verified artifacts.
   - Final security/authorization review.

## Continuation rule
On restart, read this file and `PROGRESS_LOG.md` first, inspect the latest main commit, active CI run(s), workflow runs, and repository tree, then continue from the latest saved state. After every meaningful milestone, update both checkpoint files with current status, completed work, technical decisions, remaining work, and the exact next step.

**These files and the latest repository state are the authoritative continuation source.**
