# Development Progress Log

## 2026-08-29 — Milestone 463

### Current focus
Refund -> seller earnings integrity, payout eligibility, corrected CI verification, and payment provider runtime hardening.

### Completed
- Seller Application integrated into `main`.
- Backend Regression includes Seller Application acceptance.
- `backend-regression.yml` supports `workflow_dispatch`.
- Canonical payout schema and seller/admin payout routes are aligned with migrations.
- Seller payout route uses a PostgreSQL transaction plus `pg_advisory_xact_lock` keyed by seller/currency.
- Corrected payout acceptance concurrency coverage to issue two simultaneous 2,500 JPY requests against a 3,500 JPY remaining withdrawable balance, asserting exactly one `201` and one `409 amount_exceeds_withdrawable_balance`.
- Seller payout API enforces the existing 1,000 JPY minimum payout policy and acceptance coverage verifies 999 JPY rejection.
- Checkout HTTP route now passes selected `providerId` through to provider routing.
- Provider catalog/selection supports Stripe, PayPal, Adyen, Paddle and PayPay at the architecture level; only Stripe currently has a real checkout adapter.
- **2026-08-29:** Source audit found a critical settlement gap: successful payment settlement updated `payments` and `orders` and created entitlement, but did not create the canonical `seller_earnings` ledger row required by payout balance calculations.
- **2026-08-29:** Fixed `complete-payment.js` to join the product owner and insert one `seller_earnings` row inside the same transaction as payment/order settlement.
- The new earning uses `gross_amount = order.amount`, `platform_fee = 0`, `net_amount = order.amount`, order currency, and `status = 'available'`.
- The insert is idempotent on `UNIQUE(order_id, product_id)` and also runs for an unprocessed event arriving after an already-paid order, so a missing earning row can be repaired without duplication.
- Added database acceptance coverage proving one seller earning is created and remains one row after a retry event.
- Confirmed canonical `seller_earnings` schema in `011_seller_earnings.sql`, including `pending/available/paid/refunded/cancelled` states, `refunded_at`, and `UNIQUE(order_id, product_id)`.
- **2026-08-29:** Fixed `refund-payment.js` so successful refund processing also marks the matching seller earning `refunded` and records `refunded_at` in the same transaction as order refund and entitlement revocation.

### Important financial design decision
- `seller_earnings.platform_fee` currently receives an explicit `0` because no configurable platform-fee policy is wired into the current settlement path. This is intentionally not described as a final commercial fee model.
- Refunds must remove the matching sale from `available` payout eligibility. A separate accounting treatment is still required for refunds after an earning has already been paid out.

### Verification status
- Latest corrected refund code is now on `main` at commit `2709c2f459ead11abf001119e3c9b540ea80ce9b` before this documentation checkpoint.
- A fresh CI run for the corrected refund implementation must be observed before claiming runtime verification.
- Corrected payout concurrency and minimum-payout acceptance are implemented but not yet empirically passed in CI.
- Dedicated refund-to-earnings acceptance coverage still needs to be added and passed in CI.
- Checkout provider routing source-level gap is fixed; dedicated HTTP contract coverage remains outstanding.
- Stripe webhook provider consistency through the complete runtime path remains to be verified.
- Real PayPal, Adyen, Paddle and PayPay adapters remain outstanding.
- Seller, Buyer and Admin browser-level acceptance remains incomplete.

### Do not claim
- Do not claim payout runtime concurrency is green without an actual CI run containing the corrected tests.
- Do not claim seller earnings settlement is runtime-verified without an actual database acceptance run containing the corrected code.
- Do not claim refund earnings reversal is runtime-verified without dedicated acceptance evidence.
- Do not claim PayPal/Adyen/Paddle/PayPay are real payment integrations until adapters are implemented and runtime-tested.
- Do not claim browser E2E or production release readiness is complete.

### Exact checkpoint
Latest main commit: `2709c2f459ead11abf001119e3c9b540ea80ce9b`.
Previous corrected seller-earnings CI evidence exists for run `33245987373`; the refund correction post-dates that run and therefore requires a new CI run.

### Next exact task
1. Inspect push-triggered CI runs for `2709c2f459ead11abf001119e3c9b540ea80ce9b` and record the exact conclusion/failed step.
2. Add database acceptance coverage for refund -> `seller_earnings.status = refunded` and refund idempotency.
3. Verify payout eligibility after refund and decide/implement treatment for already-paid earnings.
4. Add/verify Checkout HTTP contract coverage for selected `providerId` passthrough.
5. Trace Stripe provider identity from Checkout metadata through webhook/event ledger and `completePayment`.
6. Continue payout runtime/CI verification and real non-Stripe adapter work.

### Continuation rule
On restart, read this file and `PROJECT_STATE.md` first, inspect the latest main commit, active CI run(s), workflow runs, and repository tree, then continue from the latest saved state. After every meaningful milestone, update both checkpoint files with current status, completed work, technical decisions, remaining work, and the exact next step.

**These files and the latest repository state are the authoritative continuation source.**
