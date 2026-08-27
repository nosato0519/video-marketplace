# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 376 — Seller payout request API added and registered.**

## Current status
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Frontend: responsive storefront prototype, localized application shell, buyer/seller/admin UI foundations.
- Backend: Node/Express/PostgreSQL foundation with security headers, health endpoint, catalog/product/order/checkout boundaries and payment webhook handling.
- Commerce: hosted checkout boundary, verified payment webhook settlement, idempotent entitlement grant and seller settlement records implemented at service/boundary level.
- Protected media: authenticated entitlement-gated streaming route exists at `/api/media/:productId/stream`.
- Buyer downloads: authenticated entitlement-gated download route exists at `/api/media/:productId/download`, with attachment semantics, private/no-store caching and validated byte ranges.
- Media storage: provider-neutral storage boundary plus secure local filesystem adapter exists for development/testing.
- Seller UI: `storefront/seller.html` supports authenticated product listing, draft creation, secure video upload, persistent media library selection, editing, publish/unpublish, and Seller profile/verification controls.
- Seller onboarding: `seller_profiles` migration and authenticated Seller profile read/update and verification submission API exist.
- Seller earnings: `seller_earnings` ledger migration exists with seller/order/product ownership, gross/platform-fee/net amounts, currency, lifecycle status, timestamps and uniqueness protection per order/product.
- Seller earnings API: authenticated `GET /api/seller/earnings` returns seller-only earnings summary plus recent earning records.
- Seller payout API: authenticated `GET /api/seller/payouts` lists the logged-in seller's payout requests; authenticated `POST /api/seller/payouts` validates currency/amount, checks available earnings, accounts for existing pending payout requests, and creates a `requested` payout record.
- Payouts use the existing payout lifecycle (`requested`, `reviewing`, `approved`, `processing`, `paid`, `failed`, `cancelled`) and do not pretend to transfer money automatically.
- Verification: no automatic/fake approval is implemented. Submission enters `submitted` and is intended for Admin review.
- Documentation: installation/deployment manual, buyer/seller/admin acceptance requirements, handoff guide and operations-manual outline exist.
- Continuation: this file is the authoritative project state and must be updated after every meaningful milestone.

## Completed technical milestones in the current media-security/commerce phase
- Connected protected media route to the main API server.
- Added startup integration contracts for route registration and webhook/parser ordering.
- Added entitlement-gated media streaming boundary.
- Added safe byte-range parser and `206 Partial Content` handling.
- Added validated range forwarding at the storage boundary.
- Added secure local media storage adapter with path traversal protection.
- Added explicit media storage provider factory and startup wiring.
- Added startup security configuration validation and repository safeguards for `.env`/private media.
- Added payment webhook signature verification, settlement boundary, idempotent entitlement grant and purchased-video access control.
- Added short-lived secure media delivery token foundation.
- Added authenticated buyer download route with range support and regression tests.
- Strengthened installation and production acceptance documentation.
- Added Seller Dashboard product listing/draft/upload/edit/publish integration.
- Added persistent Seller media asset library API and Dashboard integration.
- Added Seller profile/verification database foundation and API.
- Connected Seller profile/verification to the Seller Dashboard.
- Added Seller earnings ledger and authenticated Seller earnings API.
- Added Seller payout request/list API and registered it with the main server.

## Important architecture decisions
- Centrally operated marketplace with multiple independent sellers.
- One-time sales, bundles/sets, free/paid videos and discounts; no monthly membership at this stage.
- Streaming and download support subject to product/operator download policy.
- Multi-currency and multilingual architecture.
- Seller registration, verification, upload, review, sales and payout management are first-class functionality.
- Seller earnings are represented as a separate ledger rather than calculating arbitrary totals from client-side UI data.
- Payout requests are records for an admin/provider-controlled payout lifecycle; the seller API never claims that funds were transferred merely because a request was created.
- Safety/moderation, reporting, takedown/removal, account controls, auditability and region restrictions are architectural requirements.
- Admin must be usable from smartphone and desktop and routine operation must require no programming, SQL, shell or config-file editing.
- Video assets remain in private storage; authorization occurs before media access.
- Payment integrations remain replaceable/configurable and raw card details are never stored.
- Adult content is not assumed universally legal or supported by every provider; actual launch jurisdictions and provider policies must be verified before production.
- Eventual self-hosted ZIP distribution is a product deliverable; never ship secrets or private project data.

## Known issues / risks
- Frontend shell still uses hash routes and is not yet a production router.
- Product detail and checkout still require full end-to-end database-backed integration and production UI wiring.
- Buyer library/account UI still needs full authenticated purchase/download acceptance testing.
- Seller onboarding/verification UI is now connected but needs real database/API acceptance testing.
- Seller earnings API is implemented but still needs Dashboard UI integration and end-to-end validation against real successful payment/settlement records.
- Seller payout API is implemented but still needs Dashboard UI integration, Admin review actions and end-to-end payout acceptance testing.
- PostgreSQL environment still needs clean provisioning and end-to-end testing.
- Authentication/session persistence, region controls and complete payout lifecycle still need completion and integration testing.
- No production object-storage provider, video processing pipeline or CDN is connected yet.
- Production-grade signed-download token lifecycle/revocation/audit controls remain if signed delivery is selected for production.
- Locale production build tooling and human translation review remain.
- Payment-provider/content-policy compatibility must be verified before live credentials, especially for adult content.
- Japan-specific tax, invoicing, consumer-protection and privacy requirements must be reviewed for actual launch.
- Commercial ZIP is not yet ready; clean-install, upgrade, backup/restore, licensing and final acceptance testing remain.

## Next step
**Connect Seller Sales & Earnings/Payout UI to the new APIs.** Add earnings summary, earning history, withdrawable balance, payout request form and payout history to the Seller Dashboard. Then build Admin payout review/approval actions around the existing lifecycle. After Seller flows are stable, complete no-code Admin moderation/approval actions, then production media delivery, object storage/CDN, end-to-end payment/database testing and final production acceptance.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**