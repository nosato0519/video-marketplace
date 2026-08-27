# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 384 — Admin content moderation routes registered with the main API server.**

## Current status
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Frontend: responsive storefront prototype, localized application shell, buyer/seller/admin UI foundations.
- Backend: Node/Express/PostgreSQL foundation with security headers, health endpoint, catalog/product/order/checkout boundaries and payment webhook handling.
- Commerce: hosted checkout boundary, verified payment webhook settlement, idempotent entitlement grant and seller settlement records implemented at service/boundary level.
- Protected media: authenticated entitlement-gated streaming route exists at `/api/media/:productId/stream`.
- Buyer downloads: authenticated entitlement-gated download route exists at `/api/media/:productId/download`, with attachment semantics, private/no-store caching and validated byte ranges.
- Media storage: provider-neutral storage boundary plus secure local filesystem adapter exists for development/testing.
- Seller UI: product listing, draft creation, secure video upload, media library selection, editing, publish/unpublish, Seller profile/verification controls exist in `storefront/seller.html`.
- Seller onboarding: `seller_profiles` migration and authenticated Seller profile read/update and verification submission API exist.
- Seller verification: Admin-only review API lists verification submissions and supports start-review, approve, reject and recoverable request-changes actions with required notes where appropriate.
- Seller verification audit: Admin review actions write immutable `audit_events` records and seller-specific audit history can be retrieved.
- Seller verification UI: `storefront/admin-sellers.html` and `storefront/admin-sellers.js` provide no-code filtering, seller identity/profile details, review notes, approve/reject/request-changes/start-review actions and audit-history access.
- Seller earnings: `seller_earnings` ledger migration exists with seller/order/product ownership, gross/platform-fee/net amounts, currency, lifecycle status, timestamps and uniqueness protection per order/product.
- Seller earnings API: authenticated `GET /api/seller/earnings` returns seller-only earnings summary plus recent earning records.
- Seller payout API: authenticated `GET /api/seller/payouts` lists the logged-in seller's payout requests; authenticated `POST /api/seller/payouts` validates currency/amount, checks available earnings, accounts for existing pending payout requests, and creates a `requested` payout record.
- Seller earnings/payout UI: `storefront/seller-earnings.html` and `storefront/seller-earnings.js` provide responsive earnings summary, available balance, paid/refunded totals, sales count, payout request form and payout history connected to the Seller APIs.
- Admin payout API/UI/audit: payout review, valid lifecycle transitions and audit history are implemented.
- Content moderation foundation: `content_reviews`, `content_reports` and `rights_declarations` database structures already exist.
- Admin content moderation API: `backend/src/admin/content-moderation-routes.js` provides Admin-only review listing/status transitions, report listing/status transitions and product Takedown creation; it is now registered in `backend/src/server.js` under `/api/admin`.
- Adverse moderation decisions: reject, changes-requested and block actions require a human-readable note; invalid state transitions are rejected.
- Moderation audit: content review/report/Takedown actions write immutable `audit_events` records with transition/reason metadata.
- Admin content moderation UI: `storefront/admin-content-moderation.html` and `storefront/admin-content-moderation.js` provide no-code review/report tabs, status filtering, approve/reject/request-changes/block actions, report resolution/dismissal, Takedown action and audit-history access.
- Payouts use the existing payout lifecycle (`requested`, `reviewing`, `approved`, `processing`, `paid`, `failed`, `cancelled`) and do not pretend to transfer money automatically.
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
- Added Seller earnings/payout UI page connected to the Seller APIs.
- Added Admin payout review/status API and registered it with the main server.
- Added Admin payout review UI connected to the payout status API.
- Added Admin payout audit API and connected audit history to the Admin payout UI.
- Added Admin Seller verification API with audit logging and recoverable request-changes state.
- Added Admin Seller verification review UI.
- Added Admin content moderation/report/Takedown API and audit logging.
- Registered Admin content moderation routes in the main API server.
- Added Admin content moderation/report/Takedown review UI.

## Important architecture decisions
- Centrally operated marketplace with multiple independent sellers.
- One-time sales, bundles/sets, free/paid videos and discounts; no monthly membership at this stage.
- Streaming and download support subject to product/operator download policy.
- Multi-currency and multilingual architecture.
- Seller registration, verification, upload, review, sales and payout management are first-class functionality.
- Seller earnings are represented as a separate ledger rather than calculating arbitrary totals from client-side UI data.
- Payout requests are records for an admin/provider-controlled payout lifecycle; the seller API never claims funds were transferred merely because a request was created.
- Admin payout status changes are restricted to explicit valid transitions; `paid` is only reachable from `processing`, while failures can return to `reviewing` for rework.
- Admin payout status changes create an immutable audit event containing the actor, transition and relevant metadata.
- Seller verification has explicit `submitted`, `under_review`, `verified`, `rejected` and recoverable `request_changes` states; rejection/request-changes decisions require a human-readable note.
- Content moderation has explicit review/report state machines and Admin-only Takedown controls; adverse decisions require reasons.
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
- Seller onboarding/verification UI is connected but needs real database/API acceptance testing.
- Seller earnings/payout UI is connected to the APIs but needs end-to-end database-backed acceptance testing.
- Admin payout review UI is connected but needs full database-backed acceptance testing.
- Admin payout audit history UI is connected but needs database-backed acceptance testing.
- Admin Seller verification UI/API need database-backed acceptance testing.
- Admin content moderation/report/Takedown UI/API need database-backed acceptance testing.
- Takedown currently records the blocking review/audit action; product publication-state enforcement must be completed and tested so blocked content is actually unavailable to buyers everywhere.
- PostgreSQL environment still needs clean provisioning and end-to-end testing.
- Authentication/session persistence, region controls and complete payout lifecycle still need completion and integration testing.
- No production object-storage provider, video processing pipeline or CDN is connected yet.
- Production-grade signed-download token lifecycle/revocation/audit controls remain if signed delivery is selected for production.
- Locale production build tooling and human translation review remain.
- Payment-provider/content-policy compatibility must be verified before live credentials, especially for adult content.
- Japan-specific tax, invoicing, consumer-protection and privacy requirements must be reviewed for actual launch.
- Commercial ZIP is not yet ready; clean-install, upgrade, backup/restore, licensing and final acceptance testing remain.

## Next step
**Complete actual Takedown enforcement and public-report submission.** Ensure a blocked product cannot appear in catalog/detail/search or be streamed/downloaded, and add the buyer-facing report-content endpoint/UI that creates `content_reports` records for Admin review. Then run end-to-end moderation acceptance tests.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**