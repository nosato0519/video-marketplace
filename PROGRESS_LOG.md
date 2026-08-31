# Development Progress Log

## 2026-08-31 — Milestone 466

### Current focus
Post-payout-merge checkpoint and authenticated browser E2E preparation.

### Completed
- Seller payout allocation provenance and payout-paid settlement implemented and validated.
- Cancelled payout allocations no longer consume withdrawable balance.
- Backend Regression #644 passed all covered backend acceptance flows, including 187 unit tests, auth, payments/refunds, Buyer purchase, Seller application/product-media, Seller earnings/payout, Admin payout concurrency, and media authorization/upload/access.
- Clean Install #229 passed.
- PostgreSQL Migration Acceptance #255 passed.
- PR #8 was squash-merged to `main` as `0dd062065fdcbf96355ec23adb117b64eb7e2998`.
- Updated `PROJECT_STATE.md` to make the post-merge state the authoritative continuation checkpoint.

### Important financial design decisions
- Payout allocations are the provenance layer; an earning becomes `paid` only when cumulative allocations from paid payouts cover its full `net_amount`.
- Cancelled payouts must not consume withdrawable balance.
- Refunded earnings are excluded from payout eligibility.
- Refunds after an earning has already been paid out still require a recovery/receivable policy before commercial release.
- `seller_earnings.platform_fee` remains explicitly `0`; no configurable commercial fee policy is wired yet.

### Verification status
- Backend regression: GREEN (#644).
- Clean install: GREEN (#229).
- PostgreSQL migration acceptance: GREEN (#255).
- Seller payout settlement: runtime-verified GREEN in #644.
- Admin payout concurrency: runtime-verified GREEN in #644.
- Media authorization/upload/access: runtime-verified GREEN in #644.
- Browser-level authenticated Buyer/Seller/Admin acceptance: OUTSTANDING.
- Checkout provider HTTP contract/provider consistency: OUTSTANDING.
- Real PayPal/Adyen/Paddle/PayPay adapters: OUTSTANDING.
- Refund-after-payout accounting: OUTSTANDING.
- Final commercial release readiness: NOT CLAIMED.

### Next exact task
1. Inspect existing `app/` browser pages and Playwright/CI browser infrastructure.
2. Add Buyer browser E2E: browse → product detail → purchase/session → Account/Orders/Library → protected watch/download.
3. Add Seller browser E2E: application → product/media → dashboard → earnings/payout.
4. Add Admin browser E2E: verification → moderation → payout review.
5. Run browser acceptance in CI and fix exact failures only.
6. Then return to provider integration and refund-after-payout accounting hardening.

### Continuation rule
On restart, read this file and `PROJECT_STATE.md` first, inspect latest `main`, active CI/workflow runs, and repository tree, then continue from the latest saved state. After every meaningful milestone, update both checkpoint files.

**Latest functional main:** `0dd062065fdcbf96355ec23adb117b64eb7e2998` before this checkpoint-doc commit.
**Checkpoint-doc commit:** `5dbe5bcc406aba4caa11747a8ab4865d8c90927e`.

**These files and the latest repository state are the authoritative continuation source.**
