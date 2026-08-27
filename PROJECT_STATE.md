# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 425 — Seller authenticated profile/earnings/payout acceptance is being hardened against the first CI failure; UI/browser acceptance follows after CI is green.**

## Current status
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Core catalog/detail, purchase, payment, refund/failure, protected media, moderation/reporting and seller product/media APIs are implemented and covered by automated acceptance tests.
- Buyer order history and reporting acceptance passes on the canonical UUID commerce schema.
- Seller profile read/update and verification submission APIs are mounted.
- Seller earnings are seller-scoped and expose aggregate/recent ledger rows.
- Seller payout creation validates currency, available balance and pending payout exposure.
- Admin payout, seller verification and content moderation routes are mounted.
- Fresh PostgreSQL migration preflight/execution is deterministic and concurrency-safe.
- Legacy BIGINT purchase installs remain deliberately blocked until a reviewed backup/rollback migration plan exists.
- The latest PostgreSQL acceptance run reached every prior acceptance test successfully; only the new seller profile/earnings/payout E2E failed.

## Latest discovered failure and resolution
Run #83 failed only at `http-seller-profile-earnings-payout-e2e`. The fixture called the seller profile PATCH with snake_case fields and used a nonexistent `/api/seller/verification` endpoint, while the canonical API requires `displayName`, `legalName`, `countryCode` and `/api/seller/profile/submit-verification`. The fixture also had no `seller_earnings` ledger row, so earnings assertions were not aligned with the actual ledger-backed API. The fixture has now been corrected to the canonical API/schema, seeded with a seller earnings row, and expanded to verify verification duplicate protection, seller earnings isolation, successful payout creation and pending-balance overdraw protection.

## Remaining work
- Run the corrected seller profile/earnings/payout acceptance and fix only concrete failures.
- Wire buyer/seller profile, order history, reporting, earnings and payout flows into the UI and browser-level acceptance.
- Extend DB-backed integration coverage for Admin report processing, Takedown and blocked catalog/detail/media access.
- Complete production authentication/session, privacy/account controls, region restrictions and PostgreSQL acceptance testing.
- Complete payment/provider production compatibility review.
- Design and implement a reviewed BIGINT→UUID legacy purchase data migration only after backup/restore and rollback strategy is defined.
- Finish clean-install, backup/restore, licensing, documentation and commercial ZIP acceptance testing.

## Progress memo
- **Completed:** Core commerce, moderation, protected media, buyer purchase→Library→download, buyer order-history/report acceptance, seller media/product/publish/ownership isolation, seller profile/earnings/payout API surface.
- **Latest fix:** Seller authenticated E2E fixture aligned with canonical profile field names, verification route, seller earnings ledger and payout balance rules.
- **In progress:** CI verification of corrected seller profile/earnings/payout E2E.
- **Next:** Once CI is green, begin authenticated buyer/seller UI integration and browser acceptance; do not skip the CI gate.
- **Key decisions:** Keep cross-seller resource access at 404 to reduce existence leakage; never claim CI success without a completed run; never automatically convert legacy BIGINT purchase data; acceptance fixtures must use the canonical current schema and route contracts rather than legacy assumptions.

## Progress memo rule
After each meaningful milestone or discovered failure, update this file with what was completed, what remains, the important technical decision, and the exact next step. Do not claim CI success without a verifiable run result.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**
