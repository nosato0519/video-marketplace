# Video Marketplace Project State

## Current milestone
**Milestone 450 — Release-readiness audit identified a payout data-model mismatch that must be resolved before Admin payout/metrics acceptance.**

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

### Verification status
- Latest known PostgreSQL acceptance run (#101) is green.
- Admin, Buyer and Seller static regressions are green; Seller Product Flow (#3) and Buyer purchase flow (#1) are confirmed green.
- Media upload hardening workflow was updated to include route-level tests and was observed green.
- Seller, Buyer and Admin browser-level acceptance is NOT complete. Do not claim runtime/browser acceptance green.

### Release blocker found
`backend/db/005_seller_workflow.sql` defines `seller_payout_requests` with `seller_id REFERENCES sellers(id)`, while the canonical schema defines `seller_profiles`. Seller/Admin payout routes instead read/write `payouts`, and seller payout creation also reads `seller_earnings`. `backend/db/002_commerce.sql` defines `seller_settlements` but does not define `payouts` or `seller_earnings`. This is not clean-install consistent as currently evidenced.

Do not add a compatibility/dummy table merely to make tests pass. Choose one canonical payout model, reconcile seller identity and columns, update seller/admin routes, add migration/regression coverage, then verify clean install.

## Remaining work — priority order
1. **Payout data-model reconciliation — BLOCKER**
   - Choose canonical seller identity and payout-request table.
   - Align seller payout creation/listing and Admin payout review/status transitions.
   - Align earnings/settlement calculations.
   - Add reviewed migration for existing installs if needed.
   - Add clean-install and route-level regression coverage.
2. **Admin integration**
   - Live metrics after canonical payout contract exists.
   - Admin payout review UI.
   - Seller verification review UI.
   - DB-backed moderation/takedown acceptance.
3. **Browser E2E**
   - Seller authenticated/unauthorized flows.
   - Buyer Product → Order → Checkout → Account → Orders → Library → Watch/Download.
   - Admin dashboard/moderation authenticated and unauthorized flows.
4. **Production hardening**
   - Production session/auth behavior, privacy/account controls, region/compliance controls, provider compatibility, security review.
5. **Clean install / restore**
   - PostgreSQL clean install and backup/restore verification.
6. **Commercial release**
   - License/operator docs, final ZIP, final buyer/seller/admin/payment/media/security/install acceptance.

## Exact next step
**Reconcile the payout data model first. Then implement Admin live metrics against that canonical model, add regression coverage, resume Browser E2E, and finish the release gate.**

## Continuation rule
At the start of every development session, read this file first, inspect latest commits and repository tree, and continue from the latest saved state. After every meaningful milestone, update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**This file and the latest repository state are the authoritative continuation source.**
