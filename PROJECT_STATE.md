# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 426 — Seller dashboard UI is wired to the authenticated profile, verification, earnings and payout APIs; the corrected seller E2E still requires a verifiable CI run before browser acceptance proceeds.**

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
- Seller dashboard UI is now implemented at `seller/dashboard.html` and calls the canonical authenticated seller profile, verification, earnings and payout endpoints.
- Seller product management now links directly to the seller dashboard.
- The last verifiable PostgreSQL acceptance run reached every prior acceptance test successfully; the corrected seller profile/earnings/payout E2E has not yet produced a new verifiable CI result after the fixture correction.

## Latest discovered failure and resolution
Run #83 failed only at `http-seller-profile-earnings-payout-e2e`. The fixture called the seller profile PATCH with snake_case fields and used a nonexistent `/api/seller/verification` endpoint, while the canonical API requires `displayName`, `legalName`, `countryCode` and `/api/seller/profile/submit-verification`. The fixture also had no `seller_earnings` ledger row, so earnings assertions were not aligned with the actual ledger-backed API. The fixture was corrected to the canonical API/schema, seeded with a seller earnings row, and expanded to verify verification duplicate protection, seller earnings isolation, successful payout creation and pending-balance overdraw protection.

## Completed this milestone
- Added authenticated seller dashboard UI for profile editing and verification submission.
- Added earnings summary and recent earnings ledger display.
- Added payout request form with server-side validation/error display and payout history.
- Added navigation between seller dashboard, product management and storefront.
- Kept all seller data requests same-origin and server-authorized; the UI does not bypass backend authorization.

## Remaining work
- Obtain a verifiable CI run for the corrected seller profile/earnings/payout acceptance and fix only concrete failures.
- Wire buyer profile, order history and reporting flows into the UI and browser-level acceptance.
- Complete seller dashboard browser acceptance against authenticated sessions.
- Extend DB-backed integration coverage for Admin report processing, Takedown and blocked catalog/detail/media access.
- Complete production authentication/session, privacy/account controls, region restrictions and PostgreSQL acceptance testing.
- Complete payment/provider production compatibility review.
- Design and implement a reviewed BIGINT→UUID legacy purchase data migration only after backup/restore and rollback strategy is defined.
- Finish clean-install, backup/restore, licensing, documentation and commercial ZIP acceptance testing.

## Progress memo
- **Completed:** Core commerce, moderation, protected media, buyer purchase→Library→download, buyer order-history/report acceptance, seller media/product/publish/ownership isolation, seller profile/earnings/payout API surface, seller dashboard UI integration.
- **Latest fix:** Seller authenticated E2E fixture aligned with canonical profile field names, verification route, seller earnings ledger and payout balance rules.
- **Latest UI milestone:** Authenticated seller dashboard added and linked from seller product management.
- **In progress:** CI verification of corrected seller profile/earnings/payout E2E, followed by seller browser acceptance.
- **Next:** Get a verifiable green CI result for the corrected seller E2E; then expand authenticated buyer/seller UI and browser acceptance without skipping the CI gate.
- **Key decisions:** Keep cross-seller resource access at 404 to reduce existence leakage; never claim CI success without a completed run; never automatically convert legacy BIGINT purchase data; acceptance fixtures must use the canonical current schema and route contracts rather than legacy assumptions.

## Progress memo rule
After each meaningful milestone or discovered failure, update this file with what was completed, what remains, the important technical decision, and the exact next step. Do not claim CI success without a verifiable run result.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**
