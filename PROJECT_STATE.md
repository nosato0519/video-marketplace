# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 424 — Buyer order/report acceptance fixture aligned with canonical UUID commerce schema; seller authenticated HTTP acceptance is next.**

## Current status
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Core catalog/detail, purchase, payment, refund/failure, protected media, moderation/reporting and seller product/media APIs are implemented and covered by automated acceptance tests.
- Buyer order history uses canonical UUID `orders` and joins directly through `orders.product_id`.
- Buyer report API is mounted and enforces published/active/blocked-product checks and duplicate open-report prevention.
- Seller profile API supports read/update and verification submission state guards.
- Seller earnings API returns seller-scoped aggregate and recent earning records.
- Seller payout API validates amount/currency, available balance and pending payout limits before creating a requested payout.
- Admin payout, seller verification and content moderation routes are mounted.
- Fresh PostgreSQL migration preflight and migration execution are deterministic and concurrency-safe.
- Legacy BIGINT purchase installs are deliberately blocked until a reviewed backup/rollback migration plan exists.
- Backend Regression and the previously completed PostgreSQL acceptance suite have passed through seller media/product/publish/ownership isolation.

## Latest discovered failure and resolution
Run #78 reached `http-buyer-order-report-e2e` but failed before the API checks because its fixture inserted an `orders` row without the canonical required `product_id` and referenced a nonexistent legacy `order_items` table. The canonical schema defines `orders.product_id` as NOT NULL and does not use `order_items`. The acceptance fixture has now been corrected to create the order with `product_id` directly and to use the canonical `entitlements.user_id` column. This was a test-fixture/schema alignment issue, not evidence of a production API failure.

## Remaining work
- Run the corrected buyer order/report acceptance and fix only concrete failures.
- Add authenticated HTTP E2E coverage for seller profile read/update/verification state transitions.
- Add authenticated HTTP E2E coverage for seller earnings isolation and payout balance/pending-payout validation.
- Wire buyer/seller profile, order history, reporting, earnings and payout flows into the UI and browser-level acceptance.
- Extend DB-backed integration coverage for Admin report processing, Takedown and blocked catalog/detail/media access.
- Complete production authentication/session, privacy/account controls, region restrictions and PostgreSQL acceptance testing.
- Complete payment/provider production compatibility review.
- Design and implement a reviewed BIGINT→UUID legacy purchase data migration only after backup/restore and rollback strategy is defined.
- Finish clean-install, backup/restore, licensing, documentation and commercial ZIP acceptance testing.

## Progress memo
- **Completed:** Core commerce, moderation, protected media, buyer purchase→Library→download, seller media/product/publish/ownership isolation, buyer order-history/report API, seller profile/earnings/payout API surface.
- **Latest fix:** Corrected buyer order/report E2E fixture to the canonical UUID order/entitlement schema.
- **In progress:** CI verification of corrected buyer order/report E2E.
- **Next:** Seller profile + earnings/payout authenticated HTTP E2E, then UI/browser acceptance.
- **Key decisions:** Keep cross-seller resource access at 404 to reduce existence leakage; never claim CI success without a completed run; never automatically convert legacy BIGINT purchase data; acceptance fixtures must use the canonical current schema rather than legacy table assumptions.

## Progress memo rule
After each meaningful milestone or discovered failure, update this file with what was completed, what remains, the important technical decision, and the exact next step. Do not claim CI success without a verifiable run result.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**
