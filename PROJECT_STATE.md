# Video Marketplace Project State

## Current milestone
**Milestone 465 — Payout-to-earnings allocation ledger added; payout-paid settlement wiring and runtime verification remain.**

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
- Seller payout route enforces the 1,000 JPY minimum.
- Checkout route passes selected `providerId` through to provider routing.
- Successful payment settlement creates exactly one canonical `seller_earnings` row in the same transaction as payment/order settlement.
- Refund settlement marks the matching seller earning `refunded` and records `refunded_at` atomically with order refund and entitlement revocation.
- Refund acceptance coverage verifies earning creation, refund reversal, zero available balance, and duplicate refund idempotency.
- **2026-08-29:** Added `payout_earnings_allocations` migration so each payout records exactly which seller-earnings rows it consumes, including partial earnings allocation and multi-earning payouts.
- **2026-08-29:** Seller payout creation now allocates the requested payout amount against available earnings inside the same transaction, preserving seller/currency locking and failing atomically if the allocation invariant cannot be satisfied.
- **2026-08-29:** Added a dedicated payout-paid settlement helper and recorded the invariant: an earning becomes `paid` only when cumulative allocations from `paid` payouts cover its full `net_amount`; partial allocations remain available.
- **2026-08-29:** Added a checkpoint note file documenting the payout/earnings settlement invariant before wiring the admin status route.

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

### Payout accounting architecture findings
- `seller_earnings` is the canonical source of seller available balance.
- `payout_earnings_allocations` now provides provenance from each payout to the earnings it consumes.
- A payout can span multiple earnings rows or partially consume one earnings row.
- Failed/cancelled payouts do not count as active allocations for payout reservation.
- Payout-paid settlement must mark an earning `paid` only when cumulative paid allocations cover its full net amount.
- Refunds after an earning has already been paid out still require a separate recovery/receivable policy before commercial release.

### Verification status
- Dedicated refund-to-earnings acceptance coverage is on `main`, but runtime CI evidence for that dedicated test remains outstanding.
- Fresh corrected migration/core-regression CI previously passed on the payment-earnings settlement change.
- Payout allocation changes in Milestone 465 require fresh migration and regression CI evidence.
- Payout concurrency and minimum-payout acceptance are implemented but require empirical CI evidence containing those tests.
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
- `payout_earnings_allocations` records the exact payout-to-earnings consumption relationship.
- Minimum seller payout policy: 1,000 JPY at API level.
- Refunds change the matching seller earning from an eligible state to `refunded` inside the same database transaction as order refund.

## Release blocker status
**BLOCKED:** Fresh CI evidence for Milestone 465, payout-paid earnings settlement wiring/verification, refund/earnings acceptance runtime evidence, fresh/existing-install migration verification, real non-Stripe provider adapters, provider end-to-end runtime verification, and authenticated Seller/Buyer/Admin browser E2E remain outstanding.

## Remaining work — priority order
1. **Milestone 465 payout settlement wiring and CI — CURRENT**
   - Wire `settlePayoutEarnings()` into the admin `processing -> paid` transition in the same transaction.
   - Add acceptance coverage for full and partial payout allocation.
   - Run fresh migration/regression CI and record exact evidence.
2. **Refund / seller earnings integrity**
   - Run the dedicated refund-to-earnings acceptance in CI.
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
**Wire `settlePayoutEarnings()` into `backend/src/admin/payout-routes.js` for `processing -> paid`, add payout-allocation acceptance coverage, then run fresh migration/regression CI. Do not mark payout-paid settlement verified until the CI evidence passes.**

## Continuation rule
At the start of every development session, read this file first, inspect `PROGRESS_LOG.md`, the latest main commit, active CI run(s), workflow runs, and repository tree, then continue from the latest saved state. After every meaningful milestone, update both checkpoint files with current status, completed work, technical decisions, remaining work, and the exact next step.

**These files and the latest repository state are the authoritative continuation source.**
