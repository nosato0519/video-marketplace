# Development Progress Log

## 2026-08-29 — Milestone 461

### Current focus
Payout runtime verification and payment-provider routing integrity.

### Completed
- Seller Application integrated into `main`.
- Backend Regression includes Seller Application acceptance.
- `backend-regression.yml` supports `workflow_dispatch`.
- Canonical payout schema and seller/admin payout routes are aligned with migrations.
- Seller payout route uses a PostgreSQL transaction plus `pg_advisory_xact_lock` keyed by seller/currency.
- Corrected payout acceptance concurrency coverage to issue two simultaneous 2,500 JPY requests against a 3,500 JPY remaining withdrawable balance, asserting exactly one `201` and one `409 amount_exceeds_withdrawable_balance`.
- Seller payout API now enforces the existing 1,000 JPY minimum payout policy and acceptance coverage verifies 999 JPY rejection.
- **2026-08-29:** Source audit traced Checkout from `/api/orders/:orderId/checkout` to `orders/checkout-service.js` and `payments/payment-owner-routing.js`.
- **2026-08-29:** Found a payment-provider routing gap: `createCheckoutSession()` already accepted `providerId`, but `checkout-routes.js` did not pass the buyer's selected `req.body.providerId` into it. This meant the public Checkout endpoint could not actually honor a provider selected by the caller.
- **2026-08-29:** Fixed `checkout-routes.js` to pass `providerId` through and added explicit API errors for missing/unconfigured provider and adapter-not-ready states.
- The fix is saved on `main` as commit `56d759925a33e772cf0c8b713c4607f6cbd5764b`.

### Payment architecture findings
- Provider catalog contains Stripe, PayPal, Adyen, Paddle and PayPay.
- Provider selection validates provider, region and currency.
- Seller/owner payment settings determine which configured provider can be used for an order.
- `createCheckoutSession()` records the selected provider on the pending payment and includes it in checkout metadata.
- **Important:** `payment-provider.js` currently has a real Stripe adapter; PayPal, Adyen, Paddle and PayPay currently resolve to unavailable/not-implemented adapters. Do not describe those four as real payment integrations yet.
- The current public Checkout route now correctly accepts a provider selection, but the end-to-end multi-provider runtime path remains unverified.

### Important verification findings
- Corrected payout concurrency test has not yet been observed in a real CI run.
- Minimum payout enforcement has not yet been observed in a real CI run.
- Checkout provider routing was previously incomplete at the HTTP boundary; this is now corrected in source.
- Real non-Stripe payment adapters remain outstanding.
- Browser E2E remains incomplete.

### Do not claim
- Do not claim payout runtime concurrency verification is green until the corrected test has actually run in CI.
- Do not claim PayPal/Adyen/Paddle/PayPay real checkout support until their adapters are implemented and runtime-tested.
- Do not claim browser E2E is complete unless a real browser workflow run is observed.
- Do not claim the entire product is release-ready while runtime, clean-install, provider, and browser verification remain outstanding.

### Exact checkpoint
Latest main commit:
- `56d759925a33e772cf0c8b713c4607f6cbd5764b` — pass selected `providerId` from Checkout HTTP route into provider routing and expose explicit provider configuration/adapter errors.

### Next exact task
1. Add/verify Checkout contract coverage proving the HTTP route passes `providerId` through to `createCheckoutSession`.
2. Trace payment event/webhook handling for provider consistency from Stripe Checkout metadata through `completePayment`.
3. Implement or explicitly scope the remaining real provider adapters (PayPal, Adyen, Paddle, PayPay) rather than leaving them misleadingly marked as ready.
4. Continue payout runtime/CI verification in parallel; keep runtime status BLOCKED until empirical evidence exists.

### Continuation rule
On restart, read this file and `PROJECT_STATE.md` first, then inspect the latest main commit, workflow runs, and repository tree before continuing. After every meaningful milestone, update both checkpoint files with current status and exact next step.
