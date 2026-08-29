# Video Marketplace Project State

## Current milestone
**Milestone 465 — Payout-to-earnings allocation ledger and payout-paid settlement wiring added; acceptance/CI verification remains.**

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
- **2026-08-29:** Added `backend/migrations/012_payout_earnings_allocations.sql` defining `payout_earnings_allocations` so each payout records exact earnings provenance and supports partial/multi-earning payouts.
- **2026-08-29:** Seller payout creation allocates requested payout amount across available earnings inside the same transaction and fails atomically if allocation cannot cover the request.
- **2026-08-29:** Added `backend/src/seller/payout-earnings-settlement.js`; an earning becomes `paid` only when cumulative allocations from paid payouts cover its full `net_amount`, while partial allocations remain available.
- **2026-08-29:** Wired the payout-paid settlement helper into Admin `processing -> paid` transition inside the existing `withTransaction()` transaction.

### Payment architecture findings
- Provider catalog contains Stripe, PayPal, Adyen, Paddle and PayPay.
- Provider selection validates provider, region and currency.
- Seller/owner payment settings determine which configured provider can be used for an order.
- `createCheckoutSession()` stores the selected provider on the pending payment and passes it into provider checkout metadata.
- `payment-provider.js` currently has a real Stripe adapter only; PayPal, Adyen, Paddle and PayPay currently resolve to unavailable/not-implemented adapters.
- The HTTP Checkout route now preserves the selected provider, but real multi-provider runtime support is not complete.
- Payment settlement now reaches the canonical seller earnings ledger atomically with payment/order settlement.
- Platform fee is currently explicitly `0`; no configurable platform-fee policy has been wired into settlement yet.
- Refund settlement reverses the canonical seller-earnings status atomically with order refund and entitlement revocation.

### Payout accounting architecture findings
- `seller_earnings` is the canonical source of seller available balance.
- `payout_earnings_allocations` provides provenance from each payout to the earnings it consumes.
- A payout can span multiple earnings rows or partially consume one earnings row.
- Failed/cancelled payouts do not count as active allocations for payout reservation.
- When an Admin payout transitions `processing -> paid`, the payout-paid settlement helper marks only fully covered earnings `paid`; partial earnings remain `available`.
- Refunds after an earning has already been paid out still require a separate recovery/receivable policy before commercial release.

### Verification status
- Milestone 465 allocation migration, payout creation allocation, and Admin paid-settlement wiring are now on `main`, but require fresh migration/regression CI evidence.
- Dedicated refund-to-earnings acceptance coverage remains on `main`, but runtime CI evidence for that dedicated test is outstanding.
- Payout concurrency and minimum-payout acceptance require empirical CI evidence containing the corrected tests.
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
- `payout_earnings_allocations` records exact payout-to-earnings consumption.
- Minimum seller payout policy: 1,000 JPY at API level.
- Refunds change the matching seller earning to `refunded` inside the same database transaction as order refund.

## Release blocker status
**BLOCKED:** Fresh CI evidence for Milestone 465, refund/earnings acceptance runtime evidence, payout/refund edge-case verification, fresh/existing-install migration verification, real non-Stripe provider adapters, provider end-to-end runtime verification, and authenticated Seller/Buyer/Admin browser E2E remain outstanding.

## Remaining work — priority order
1. **Milestone 465 verification — CURRENT**
   - Add acceptance coverage for full and partial payout allocation and payout-paid settlement.
   - Run fresh migration/regression CI and record exact evidence.
2. **Refund / seller earnings integrity**
   - Run dedicated refund-to-earnings acceptance in CI.
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
**Add database acceptance coverage for (a) full payout allocation -> all covered earnings become `paid`, (b) partial payout -> only fully covered earnings become `paid`, and (c) failed/cancelled payout allocations do not consume balance. Then run fresh migration/regression CI.**

## Continuation rule
At the start of every development session, read this file first, inspect `PROGRESS_LOG.md`, the latest main commit, active CI run(s), workflow runs, and repository tree, then continue from the latest saved state. After every meaningful milestone, update both checkpoint files with current status, completed work, technical decisions, remaining work, and the exact next step.

**These files and the latest repository state are the authoritative continuation source.**
