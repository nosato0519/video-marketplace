# Video Marketplace Project State

## Current milestone
**Milestone 451 — Canonical payout model reconciliation implemented; regression and clean-install verification remain before removing the release blocker.**

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
- **Payout model reconciliation:** seller workflow now uses `seller_profiles` as the canonical seller identity and `seller_payout_requests` as the canonical payout-request table; Seller and Admin payout routes now read/write that model.
- `seller_payout_requests` now includes the Admin lifecycle state `approved` plus review/processing timestamps required by the routes.

### Verification status
- Latest known PostgreSQL acceptance run (#101) is green.
- Admin, Buyer and Seller static regressions are green; Seller Product Flow (#3) and Buyer purchase flow (#1) are confirmed green.
- Media upload hardening workflow was updated to include route-level tests and was observed green.
- **Payout reconciliation is implemented but not yet runtime/clean-install verified.**
- Seller, Buyer and Admin browser-level acceptance is NOT complete. Do not claim runtime/browser acceptance green.

### Release blocker status
**Previous blocker: payout data-model mismatch — implementation resolved, verification pending.**

Canonical model:
- Seller identity: `seller_profiles.id` with `seller_profiles.user_id` mapping to `users.id`.
- Seller payout request: `seller_payout_requests`.
- Amount storage: `amount_minor` BIGINT; API exposes major currency amount for existing UI compatibility.
- Earnings source: `seller_settlements` with `status = 'available'`.
- Payout lifecycle: `requested → reviewing → approved → processing → paid`, with `failed/cancelled` terminal/recovery paths as defined by Admin transitions.

Important: do not reintroduce legacy `payouts` or `seller_earnings` compatibility tables just to satisfy tests. The repository's canonical commerce schema defines `seller_settlements`, and the reconciled payout routes now use the canonical workflow table.

### Remaining work — priority order
1. **Payout verification — BLOCKER UNTIL VERIFIED**
   - Add/adjust Seller payout route regression tests.
   - Add Admin payout lifecycle regression tests.
   - Verify clean-install migration order and foreign-key creation.
   - Verify payout request creation, listing, status transitions and audit events against the canonical tables.
2. **Admin integration**
   - Live metrics against canonical orders/reviews/payout data.
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
**Add and run payout Seller/Admin route regression coverage, then perform clean-install verification against the reconciled schema. If green, remove the payout blocker and continue Admin live metrics.**

## Continuation rule
At the start of every development session, read this file first, inspect latest commits and repository tree, and continue from the latest saved state. After every meaningful milestone, update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**This file and the latest repository state are the authoritative continuation source.**
