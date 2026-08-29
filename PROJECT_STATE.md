# Video Marketplace Project State

## Current milestone
**Milestone 463 — Refunds now reverse seller-earnings eligibility atomically; payout runtime/CI and real multi-provider adapters remain.**

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
- Corrected payout acceptance concurrency coverage to use two simultaneous 2,500 JPY HTTP requests against a 3,500 JPY remaining withdrawable balance, asserting exactly one `201` and one `409 amount_exceeds_withdrawable_balance`.
- Seller payout route now enforces the 1,000 JPY minimum and acceptance coverage verifies 999 JPY rejection.
- Checkout route now passes selected `providerId` through to provider routing.
- **2026-08-29:** Source audit found that successful payment settlement updated `payments` and `orders` and created entitlement, but did not create the canonical `seller_earnings` ledger row required by payout balance calculations.
- **2026-08-29:** Fixed `complete-payment.js` so settlement obtains the product owner and creates exactly one `seller_earnings` row in the same transaction, with `gross_amount = order.amount`, `platform_fee = 0`, `net_amount = order.amount`, order currency, and `status = 'available'`.
- The seller-earnings insert is idempotent on `UNIQUE(order_id, product_id)` and is also executed for an unprocessed event arriving after an order is already paid, allowing safe repair of a missing earning row without duplication.
- Added database acceptance coverage for seller-earnings creation and retry idempotency.
- **2026-08-29:** Confirmed canonical `seller_earnings` schema in migration `011_seller_earnings.sql`, including `status` values `pending/available/paid/refunded/cancelled`, `refunded_at`, and `UNIQUE(order_id, product_id)`.
- **2026-08-29:** Fixed `refund-payment.js` so a successful refund transaction also marks the matching seller earning `refunded` and records `refunded_at`, preventing the sale from remaining `available` for payout eligibility.

### Payment architecture findings
- Provider catalog contains Stripe, PayPal, Adyen, Paddle and PayPay.
- Provider selection validates provider, region and currency.
- Seller/owner payment settings determine which configured provider can be used for an order.
- `createCheckoutSession()` stores the selected provider on the pending payment and passes it into provider checkout metadata.
- `payment-provider.js` currently has a real Stripe adapter only; PayPal, Adyen, Paddle and PayPay currently resolve to unavailable/not-implemented adapters.
- The HTTP Checkout route now preserves the selected provider, but real multi-provider runtime support is not complete.
- Payment settlement now reaches the canonical seller earnings ledger atomically with payment/order settlement.
- Platform fee is currently explicitly `0`; no configurable platform-fee policy has been wired into settlement yet and must not be implied otherwise.
- Refund settlement now reverses the canonical seller-earnings status atomically with order refund and entitlement revocation.

### Verification status
- The corrected seller-earnings implementation has been exercised by source-level review; a fresh CI run containing the correction still needs to be observed before declaring runtime evidence.
- Corrected payout concurrency and minimum-payout acceptance are implemented but still require empirical CI evidence containing those tests.
- Refund/earnings reversal is now implemented transactionally; dedicated acceptance coverage for the earnings status transition still needs to be added and passed in CI.
- Checkout provider routing source-level gap is fixed; dedicated HTTP contract coverage remains outstanding.
- Stripe webhook provider consistency through the complete runtime path remains to be verified.
- Seller, Buyer and Admin browser-level acceptance remains incomplete.
- Do not claim full release readiness yet.

## Canonical seller/payout model
- Seller identity remains `users.id` for commerce, earnings and payout records.
- `seller_profiles.user_id -> users.id` is the seller-specific profile/onboarding relation.
- `seller_earnings.seller_id -> users.id`.
- `payouts.seller_id -> users.id`.
- Available balance source: `seller_earnings` rows with `status = 'available'`.
- Payout lifecycle: requested -> reviewing -> approved -> processing -> paid, with failed/cancelled branches.
- `audit_events` records payout status transitions.
- Minimum seller payout policy: 1,000 JPY at API level.
- Refunds change the matching seller earning from an eligible state to `refunded` inside the same database transaction as order refund.

## Release blocker status
**BLOCKED:** Fresh corrected CI evidence, payout runtime/CI evidence, dedicated refund/earnings acceptance, fresh/existing-install migration verification, real non-Stripe provider adapters, provider end-to-end runtime verification, and authenticated Seller/Buyer/Admin browser E2E remain outstanding.

## Remaining work — priority order
1. **Fresh corrected CI verification — BLOCKER**
   - Inspect push-triggered workflow runs for the current main commit.
   - Record exact run/job conclusion and failed step if any.
2. **Refund / seller earnings integrity**
   - Add database acceptance coverage asserting refund changes `seller_earnings` to `refunded` and repeated refund events do not duplicate or reapply the transition.
   - Verify payout eligibility excludes refunded earnings, including after a payout has already been created.
   - Decide/implement the accounting treatment for refunds after an earning has already been paid out (platform/seller receivable or equivalent ledger adjustment) before commercial release.
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
   - Seller authenticated/unauthorized flows.
   - Buyer Product -> Order -> Checkout -> Account -> Orders -> Library -> Watch/Download.
   - Admin dashboard/moderation authenticated and unauthorized flows.
6. **Production hardening**
   - Production session/auth behavior, privacy/account controls, region/compliance controls, provider compatibility, security review.
7. **Clean install / restore**
   - PostgreSQL clean install and backup/restore verification.
8. **Commercial release**
   - License/operator docs, final ZIP, final buyer/seller/admin/payment/media/security/install acceptance.

## Exact next step
**Inspect the push-triggered CI run for the latest main commit `2709c2f459ead11abf001119e3c9b540ea80ce9b`. If it passes, add and run dedicated refund-to-earnings acceptance coverage. If it fails, fix the exact failing step before moving on.**

## Continuation rule
At the start of every development session, read this file first, inspect `PROGRESS_LOG.md`, the latest main commit, active CI run(s), workflow runs, and repository tree, then continue from the latest saved state. After every meaningful milestone, update both checkpoint files with current status, completed work, technical decisions, remaining work, and the exact next step.

**These files and the latest repository state are the authoritative continuation source.**
