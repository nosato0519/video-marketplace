# Video Marketplace Project State

## Current milestone
**Milestone 452 — Canonical payout model reconciliation is implemented and protected by source-level contract coverage; runtime/clean-install verification remains.**

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
- Canonical payout reconciliation: Seller and Admin payout routes now use `seller_payout_requests`, with seller identity resolved through `seller_profiles.user_id` and balances sourced from `seller_settlements`.
- Added `backend/src/seller/payout-contract.test.js` to establish regression coverage for the canonical payout contract.

### Verification status
- Latest known PostgreSQL acceptance run (#101) is green.
- Admin, Buyer and Seller static regressions are green; Seller Product Flow (#3) and Buyer purchase flow (#1) are confirmed green.
- Media upload hardening workflow was updated to include route-level tests and was observed green.
- Payout route source contract coverage has been added; runtime payout flow and clean-install verification are still pending.
- Seller, Buyer and Admin browser-level acceptance is NOT complete. Do not claim runtime/browser acceptance green.

### Release blocker status
The previously identified payout data-model mismatch has been reconciled in the Seller/Admin route code and the seller workflow migration. The release blocker is **reduced but not removed** until runtime and clean-install verification proves the canonical model end-to-end.

Canonical model:
- `seller_payout_requests.seller_id -> seller_profiles.id`
- Seller identity: `seller_profiles.user_id -> users.id`
- Available balance: `seller_settlements` rows with `status = 'available'`
- Seller/Admin payout routes read/write `seller_payout_requests`
- Payout lifecycle: requested -> reviewing -> approved -> processing -> paid, with failed/cancelled branches and audit events.

Do not add a compatibility/dummy table merely to make tests pass. Verify the real canonical model against a clean PostgreSQL install and existing-install migration expectations.

## Remaining work — priority order
1. **Payout runtime + clean-install verification — BLOCKER**
   - Run route-level regression against PostgreSQL.
   - Verify Seller payout creation/listing and Admin review/status transitions end-to-end.
   - Verify audit events and available-balance calculations.
   - Add/adjust reviewed migration for existing installs if needed.
2. **Admin integration**
   - Live metrics after canonical payout contract exists.
   - Admin payout review UI.
   - Seller verification review UI.
   - DB-backed moderation/takedown acceptance.
3. **Browser E2E**
   - Seller authenticated/unauthorized flows.
   - Buyer Product -> Order -> Checkout -> Account -> Orders -> Library -> Watch/Download.
   - Admin dashboard/moderation authenticated and unauthorized flows.
4. **Production hardening**
   - Production session/auth behavior, privacy/account controls, region/compliance controls, provider compatibility, security review.
5. **Clean install / restore**
   - PostgreSQL clean install and backup/restore verification.
6. **Commercial release**
   - License/operator docs, final ZIP, final buyer/seller/admin/payment/media/security/install acceptance.

## Exact next step
**Execute the payout contract against the real PostgreSQL migration path, fix any runtime/schema issues found, then implement Admin live metrics against the verified canonical model.**

## Continuation rule
At the start of every development session, read this file first, inspect latest commits and repository tree, and continue from the latest saved state. After every meaningful milestone, update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**This file and the latest repository state are the authoritative continuation source.**
