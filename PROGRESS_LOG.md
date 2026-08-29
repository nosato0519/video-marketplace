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
- Code fix committed as `e6b53c701e77d07cba852193f26e383f32abc67f`.
- Checkpoint documentation committed as `28fbbe578de2451e67e4050cd5f4d247e1f7be2d`.

### Important financial design decision
- `seller_earnings.platform_fee` currently receives an explicit `0` because no configurable platform-fee policy is wired into the current settlement path. This is intentionally not described as a final commercial fee model.

### Verification status
- Seller-earnings settlement acceptance is implemented but not observed in a real CI run.
- Corrected payout concurrency and minimum-payout acceptance are implemented but not observed in a real CI run.
- Refund/partial-refund behavior against seller earnings still requires verification.
- Checkout provider routing source-level gap is fixed; dedicated HTTP contract coverage remains outstanding.
- Stripe webhook provider consistency through the complete runtime path remains to be verified.
- Real PayPal, Adyen, Paddle and PayPay adapters remain outstanding.
- Seller, Buyer and Admin browser-level acceptance remains incomplete.

### Do not claim
- Do not claim payout runtime concurrency is green without an actual CI run.
- Do not claim seller earnings settlement is runtime-verified without an actual database acceptance run.
- Do not claim PayPal/Adyen/Paddle/PayPay are real payment integrations until adapters are implemented and runtime-tested.
- Do not claim browser E2E or production release readiness is complete.

### Exact checkpoint
Latest main commit:
- `28fbbe578de2451e67e4050cd5f4d247e1f7be2d` — checkpoint after atomically wiring successful payment settlement to seller earnings creation.

### Next exact task
1. Trace refund and partial-refund handling against `seller_earnings` and payout eligibility.
2. Add/verify Checkout HTTP contract coverage for selected `providerId` passthrough.
3. Trace Stripe provider identity from Checkout metadata through webhook/event ledger and `completePayment`.
4. Continue payout runtime/CI verification; keep runtime status BLOCKED until empirical evidence exists.
5. Implement or explicitly scope the remaining real provider adapters.

### Continuation rule
On restart, read this file and `PROJECT_STATE.md` first, inspect the latest main commit, workflow runs, and repository tree, then continue from the latest saved state. After every meaningful milestone, update both checkpoint files with current status, completed work, technical decisions, remaining work, and the exact next step.

**These files and the latest repository state are the authoritative continuation source.**
