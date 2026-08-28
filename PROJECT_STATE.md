# Video Marketplace Project State

## Current milestone
**Milestone 453 — Payout canonical contract corrected against the actual migration set; Seller route and regression contract are aligned, while Admin route still requires the same correction.**

## Latest checkpoint — 2026-08-28
### Completed
- Core storefront/catalog, Buyer purchase/order/Library/watch/download authorization, payment/refund/failure handling.
- Seller product/media, publishing, ownership isolation, profile, verification, earnings and payout UI/API foundations.
- Protected media streaming/download and hardened upload validation with route-level regression tests.
- Reporting/moderation foundations and Admin moderation/payout/verification routes.
- Buyer Account/Orders/Library pages and Seller Dashboard/Product Flow UI.
- Deterministic PostgreSQL migration preflight/execution and legacy BIGINT purchase migration block.
- Admin/Seller/Buyer static contract regressions and confirmed Seller Product Flow + Buyer purchase-flow runs.
- Production configuration, backup/recovery and commercial package documentation.
- Media upload hardening workflow with route-level tests; observed green.
- Confirmed actual migration set: `010_seller_profile.sql` defines `seller_profiles.user_id` as the primary key; `011_seller_earnings.sql` defines `seller_earnings.seller_id -> users.id`; `004_payouts_audit.sql` defines canonical `payouts.seller_id -> users.id` and the payout lifecycle.
- Corrected `backend/src/seller/payout-routes.js` to use the migrated `payouts` table and `seller_earnings` available balance, with seller identity remaining `req.user.id`.
- Reworked `backend/src/seller/payout-contract.test.js` so it reads the real route/migration sources and guards against reintroducing the nonexistent `seller_payout_requests` contract.

### Verification status
- Latest known PostgreSQL acceptance run (#101) is green.
- Admin, Buyer and Seller static regressions are green; Seller Product Flow (#3) and Buyer purchase flow (#1) are confirmed green.
- Media upload hardening workflow was updated to include route-level tests and was observed green.
- Seller payout route source contract now matches the actual migration model.
- Admin payout route still references `seller_payout_requests` and `seller_profiles.id`, so payout runtime/clean-install verification remains blocked until that route is corrected and the contract test passes.
- Seller, Buyer and Admin browser-level acceptance is NOT complete. Do not claim runtime/browser acceptance green.

## Canonical seller/payout model
- Seller identity remains `users.id` for commerce, earnings and payout records.
- `seller_profiles.user_id -> users.id` is the seller-specific profile/onboarding relation; `seller_profiles` has no `id` or `status` column in the actual migration.
- `seller_earnings.seller_id -> users.id`.
- `payouts.seller_id -> users.id`.
- Available balance source: `seller_earnings` rows with `status = 'available'`.
- Payout lifecycle: requested -> reviewing -> approved -> processing -> paid, with failed/cancelled branches.
- `audit_events` records payout status transitions.
- Do not introduce `seller_payout_requests` or `seller_profiles.id` merely to satisfy stale route code; the real migration set is authoritative.

## Release blocker status
**BLOCKED:** Admin payout route is not yet aligned with the real canonical migration schema. The Seller route has been corrected. Runtime and clean-install verification must wait until both routes agree with `004_payouts_audit.sql`, `010_seller_profile.sql`, and `011_seller_earnings.sql`.

## Remaining work — priority order
1. **Correct Admin payout route — BLOCKER**
   - Use `payouts` and `users.id`.
   - Preserve the existing transition/audit behavior.
2. **Payout runtime + clean-install verification — BLOCKER**
   - Run route-level regression against PostgreSQL.
   - Verify Seller payout creation/listing and Admin review/status transitions end-to-end.
   - Verify audit events and available-balance calculations.
   - Verify fresh migration installation and existing-install migration expectations.
3. **Admin integration**
   - Live metrics after canonical payout contract is verified.
   - Admin payout review UI.
   - Seller verification review UI.
   - DB-backed moderation/takedown acceptance.
4. **Browser E2E**
   - Seller authenticated/unauthorized flows.
   - Buyer Product -> Order -> Checkout -> Account -> Orders -> Library -> Watch/Download.
   - Admin dashboard/moderation authenticated and unauthorized flows.
5. **Production hardening**
   - Production session/auth behavior, privacy/account controls, region/compliance controls, provider compatibility, security review.
6. **Clean install / restore**
   - PostgreSQL clean install and backup/restore verification.
7. **Commercial release**
   - License/operator docs, final ZIP, final buyer/seller/admin/payment/media/security/install acceptance.

## Exact next step
**Correct `backend/src/admin/payout-routes.js` to the actual `payouts`/`users.id` schema, then run the payout contract/runtime verification before touching Admin live metrics.**

## Continuation rule
At the start of every development session, read this file first, inspect latest commits and repository tree, and continue from the latest saved state. After every meaningful milestone, update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**This file and the latest repository state are the authoritative continuation source.**
