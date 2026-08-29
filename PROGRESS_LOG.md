# Development Progress Log

## 2026-08-29 — Milestone 462

### Current focus
Payment settlement -> seller earnings integrity, refund/payout eligibility, and payout runtime verification.

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
- Corrected code/test are present on `main` at `27b785bf0f27d4f7d2c152d04e0be439c2a4b7a4` before this documentation checkpoint.

### Important financial design decision
- `seller_earnings.platform_fee` currently receives an explicit `0` because no configurable platform-fee policy is wired into the current settlement path. This is intentionally not described as a final commercial fee model.

### Verification status
- GitHub Actions `clean-install` run `33245787271` / job `99082878150` was started before the corrected seller-earnings code reached `main`; it is not evidence for the corrected implementation.
- A fresh Backend Regression run for the corrected `main` is expected from the push-triggered workflow; until its check run is observed, seller-earnings settlement and payout runtime remain unverified.
- Corrected payout concurrency and minimum-payout acceptance are implemented but not yet empirically passed in CI.
- Refund/partial-refund behavior against seller earnings still requires verification.
- Checkout provider routing source-level gap is fixed; dedicated HTTP contract coverage remains outstanding.
- Stripe webhook provider consistency through the complete runtime path remains to be verified.
- Real PayPal, Adyen, Paddle and PayPay adapters remain outstanding.
- Seller, Buyer and Admin browser-level acceptance remains incomplete.

### Do not claim
- Do not claim payout runtime concurrency is green without an actual CI run containing the corrected tests.
- Do not claim seller earnings settlement is runtime-verified without an actual database acceptance run containing the corrected code.
- Do not claim PayPal/Adyen/Paddle/PayPay are real payment integrations until adapters are implemented and runtime-tested.
- Do not claim browser E2E or production release readiness is complete.

### Exact checkpoint
Latest main commit before this documentation update: `27b785bf0f27d4f7d2c152d04e0be439c2a4b7a4`.
Current active clean-install run that predates the correction: `33245787271`, job `clean-install` (`99082878150`).

### Next exact task
1. Inspect the new push-triggered CI run for corrected `main` and record its conclusion/failed step.
2. Trace refund and partial-refund handling against `seller_earnings` and payout eligibility.
3. Add/verify Checkout HTTP contract coverage for selected `providerId` passthrough.
4. Trace Stripe provider identity from Checkout metadata through webhook/event ledger and `completePayment`.
5. Continue payout runtime/CI verification; keep runtime status BLOCKED until empirical evidence exists.
6. Implement or explicitly scope the remaining real provider adapters.

### Continuation rule
On restart, read this file and `PROJECT_STATE.md` first, inspect the latest main commit, the active CI run(s), workflow runs, and repository tree, then continue from the latest saved state. After every meaningful milestone, update both checkpoint files with current status, completed work, technical decisions, remaining work, and the exact next step.

**These files and the latest repository state are the authoritative continuation source.**
