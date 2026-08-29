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

### Important financial design decision
- `seller_earnings.platform_fee` currently receives explicit `0`; no configurable commercial fee policy is wired yet.
- Refunds must remove the matching sale from `available` payout eligibility.
- Refunds after an earning has already been paid out still need a recovery/receivable policy before release.
- Payout allocations are the provenance layer; do not mark an earning paid merely because a payout exists. It must be fully covered by paid allocations.

### Verification status
- Milestone 465 migration, payout allocation, and Admin paid-settlement wiring are on `main` but require fresh migration/regression CI evidence.
- Previous corrected seller-earnings CI evidence exists for run `33245987373`.
- Refund correction and dedicated refund assertions post-date that run and still require a fresh runtime CI run.
- Payout concurrency and minimum-payout acceptance require empirical CI evidence containing the corrected tests.
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
Latest functional changes now include migration `012_payout_earnings_allocations.sql`, `payout-earnings-settlement.js`, and Admin payout paid-transition wiring. The checkpoint files themselves were updated afterward, so the latest main commit is the checkpoint commit following those functional changes.

### Next exact task
1. Add database acceptance coverage for full payout allocation -> all covered earnings become `paid`.
2. Add coverage for partial payout -> only fully covered earnings become `paid` and the remainder stays `available`.
3. Add coverage proving failed/cancelled payout allocations do not consume available balance.
4. Run fresh migration/regression CI and record exact conclusion/failed step.
5. Verify payout eligibility after refund including a real payout creation attempt.
6. Decide/implement accounting treatment for refunds after an earning has already been paid out.
7. Add/verify Checkout HTTP contract coverage for selected `providerId` passthrough and trace Stripe provider identity through webhook/event ledger and `completePayment`.
8. Continue real non-Stripe adapter work and browser E2E.

### Continuation rule
On restart, read this file and `PROJECT_STATE.md` first, inspect the latest main commit, active CI run(s), workflow runs, and repository tree, then continue from the latest saved state. After every meaningful milestone, update both checkpoint files with current status, completed work, technical decisions, remaining work, and the exact next step.

**These files and the latest repository state are the authoritative continuation source.**
