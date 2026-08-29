# Development Progress Log

## 2026-08-29 — Milestone 465

### Current focus
Payout-to-earnings allocation, payout-paid settlement, refund/payout accounting integrity, corrected CI verification, and payment provider runtime hardening.

### Completed
- Seller Application integrated into `main`.
- Backend Regression includes Seller Application acceptance.
- `backend-regression.yml` supports `workflow_dispatch`.
- Canonical payout schema and seller/admin payout routes are aligned with migrations.
- Seller payout route uses a PostgreSQL transaction plus `pg_advisory_xact_lock` keyed by seller/currency.
- Corrected payout acceptance concurrency coverage and 1,000 JPY minimum policy remain in the project.
- Checkout HTTP route now passes selected `providerId` through to provider routing.
- Provider catalog/selection supports Stripe, PayPal, Adyen, Paddle and PayPay at the architecture level; only Stripe currently has a real checkout adapter.
- Successful payment settlement now creates one canonical `seller_earnings` row atomically with payment/order settlement.
- Refund processing now marks the matching seller earning `refunded` atomically with order refund and entitlement revocation.
- Dedicated refund acceptance coverage checks creation, reversal, zero available balance, and duplicate refund idempotency.
- Confirmed canonical `seller_earnings` schema in `011_seller_earnings.sql`.
- **2026-08-29:** Added `backend/migrations/012_payout_earnings_allocations.sql` with `payout_earnings_allocations` to preserve exact payout-to-earnings provenance and support partial/multi-earning payouts.
- **2026-08-29:** Seller payout creation now allocates the requested amount across available earnings inside the same transaction, preserving seller/currency serialization and failing atomically if the allocation invariant cannot be met.
- **2026-08-29:** Added `backend/src/seller/payout-earnings-settlement.js` defining the payout-paid invariant: an earning becomes `paid` only when cumulative allocations from paid payouts cover its full `net_amount`; partial allocations remain available.
- **2026-08-29:** Wired `settlePaidPayoutEarnings()` into the Admin `processing -> paid` transition inside the existing `withTransaction()` transaction.
- **2026-08-29:** Expanded `backend/scripts/http-seller-profile-earnings-payout-e2e-acceptance.js` to verify payout allocation provenance, partial paid payout leaves the earning `available`, cancelled payout does not consume withdrawable balance, and a later full payout changes the earning to `paid` only after total paid allocations reach `net_amount`.
- **2026-08-29:** Fresh Backend Regression run `33258384757` executed against commit `cff6f454ee04d16424bf0af33968e38312ba6d51`. All prior steps through payment/refund acceptance and the 187 unit tests passed. The seller earnings/payout E2E failed at payout creation because PostgreSQL rejects `FOR UPDATE OF e` on the grouped aggregate query (`SQLSTATE 0A000`).
- **2026-08-29:** Root cause identified in `backend/src/seller/payout-routes.js`: allocation query used `GROUP BY ... FOR UPDATE OF e`. Fixed in commit `36ad9257a3400566f655dcfe13d270fa885a7d36` by aggregating first and then explicitly locking each selected `seller_earnings` row with `SELECT id ... FOR UPDATE` before inserting its allocation.
- **2026-08-29:** Updated `PROJECT_STATE.md` and this log with the exact failing CI run, root cause, fix commit, and next verification task.

### Important financial design decision
- `seller_earnings.platform_fee` currently receives explicit `0`; no configurable commercial fee policy is wired yet.
- Refunds must remove the matching sale from `available` payout eligibility.
- Refunds after an earning has already been paid out still need a recovery/receivable policy before release.
- Payout allocations are the provenance layer; do not mark an earning paid merely because a payout exists. It must be fully covered by paid allocations.

### Verification status
- Fresh migration/regression infrastructure passed through migrations, backup/restore, 187 unit tests, auth, payment webhook, payment failure, payment refund, buyer purchase, seller application, and seller product-media acceptance in run `33258384757`.
- **Run `33258384757` failed only when `http-seller-profile-earnings-payout-e2e` reached payout allocation.** PostgreSQL returned `FOR UPDATE is not allowed with GROUP BY clause` from `backend/src/seller/payout-routes.js:85`.
- The SQL locking bug is fixed in `36ad9257a3400566f655dcfe13d270fa885a7d36`; fresh CI evidence for this fix is now the immediate next task.
- Refund acceptance passed in the same regression run, but dedicated refund-to-earnings runtime status remains separately tracked.
- Payout concurrency/minimum-payout and full/partial/cancelled settlement require a fresh green runtime run after the SQL fix.
- Checkout provider routing source-level gap is fixed; dedicated HTTP contract coverage remains outstanding.
- Stripe webhook provider consistency remains to be verified end-to-end.
- Real PayPal, Adyen, Paddle and PayPay adapters remain outstanding.
- Seller, Buyer and Admin browser-level acceptance remains incomplete.

### Do not claim
- Do not claim payout runtime concurrency is green without an actual CI run containing the corrected tests.
- Do not claim payout-paid earnings settlement is runtime-verified until acceptance coverage and CI pass.
- Do not claim refund earnings reversal is runtime-verified without the dedicated acceptance run passing.
- Do not claim PayPal/Adyen/Paddle/PayPay are real payment integrations until adapters are implemented and runtime-tested.
- Do not claim browser E2E or production release readiness is complete.

### Exact checkpoint
Latest functional fix: `36ad9257a3400566f655dcfe13d270fa885a7d36` fixes the PostgreSQL-invalid `FOR UPDATE` on the grouped payout allocation query by moving row locking to explicit simple `seller_earnings` row selects. Checkpoint docs were updated in commit `2f60a0bfa6ceb6e1189ed6398a6242966203453f`.

### Next exact task
1. Run/inspect fresh migration/regression CI against `36ad9257a3400566f655dcfe13d270fa885a7d36`.
2. Confirm `http-seller-profile-earnings-payout-e2e` passes allocation provenance, partial payout, cancelled payout release, and full payout settlement assertions.
3. If CI fails, fix the exact runtime failure before proceeding.
4. If CI passes, mark full/partial/cancelled payout settlement runtime-verified.
5. Verify payout eligibility after refund including a real payout creation attempt.
6. Decide/implement accounting treatment for refunds after an earning has already been paid out.
7. Add/verify Checkout HTTP contract coverage for selected `providerId` passthrough and trace Stripe provider identity through webhook/event ledger and `completePayment`.
8. Continue real non-Stripe adapter work and browser E2E.

### Continuation rule
On restart, read this file and `PROJECT_STATE.md` first, inspect the latest main commit, active CI run(s), workflow runs, and repository tree, then continue from the latest saved state. After every meaningful milestone, update both checkpoint files with current status, completed work, technical decisions, remaining work, and the exact next step.

**These files and the latest repository state are the authoritative continuation source.**
