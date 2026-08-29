# Video Marketplace Project State

## Current milestone
**Milestone 460 — Payout API policy hardening complete; runtime/CI verification remains.**

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
- **2026-08-29:** Found and fixed an additional API contract gap: `payout-policy.js` defined a 1,000 JPY minimum payout, but the Seller payout route did not enforce it.
- **2026-08-29:** Seller payout route now rejects amounts below 1,000 JPY with `400 minimum_payout_not_reached` and reports the minimum.
- **2026-08-29:** Payout HTTP acceptance now verifies a 999 JPY request is rejected before the normal and concurrency scenarios.
- `PROGRESS_LOG.md` updated with the exact checkpoint and continuation instructions.

### Verification status
- Latest known PostgreSQL acceptance run (#101) predates the corrected concurrency and minimum-payout acceptance changes.
- Corrected concurrency test is implemented and wired into CI, but has **not** yet been observed in a real CI run.
- Minimum payout enforcement is implemented and acceptance-covered in source, but has **not** yet been observed in a real CI run.
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

## Release blocker status
**BLOCKED:** Corrected payout concurrency and minimum-payout behavior still require empirical CI/runtime verification. Fresh migration, existing-install migration, audit behavior, and authenticated Seller/Buyer/Admin browser E2E also remain outstanding.

## Remaining work — priority order
1. **Payout runtime + clean-install verification — BLOCKER**
   - Obtain/execute CI for the latest main descendant containing the corrected payout acceptance.
   - Verify true concurrent requests, minimum payout rejection, audit events, and available-balance calculations.
   - Verify fresh PostgreSQL installation and idempotent/existing-install migration behavior.
2. **Admin integration**
   - Live metrics against verified canonical tables.
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
**Get a real CI execution for the latest main commit containing both `cbba56541f2e4e8702a55bd267e28b506d449dcf` and `cde683eea2cb2aa32cf64edf9a62dea2bae0df45`. If workflow dispatch is unavailable through connected controls, continue source-level verification only and keep runtime status BLOCKED.**

## Continuation rule
At the start of every development session, read this file first, inspect `PROGRESS_LOG.md`, the latest main commit, workflow runs, and repository tree, then continue from the latest saved state. After every meaningful milestone, update both checkpoint files with current status, completed work, technical decisions, remaining work, and the exact next step.

**These files and the latest repository state are the authoritative continuation source.**
