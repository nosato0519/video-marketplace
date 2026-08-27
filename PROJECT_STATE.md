# Video Marketplace Project State

## Purpose
A reusable, international video marketplace inspired by the usability of Japanese video marketplaces such as Pancolle Movie, but independently designed and implemented. The platform must work for general video sales and be capable of supporting adult content where legally and operationally permitted.

## Current milestone
**Milestone 369 — Seller dashboard foundation connected to authenticated seller product API.**

## Current status
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Frontend: responsive storefront prototype, localized application shell, buyer/seller/admin UI foundations.
- Backend: Node/Express/PostgreSQL foundation with security headers, health endpoint, catalog/product/order/checkout boundaries and payment webhook handling.
- Commerce: hosted checkout boundary, verified payment webhook settlement, idempotent entitlement grant and seller settlement records are implemented at the service/boundary level.
- Protected media: authenticated entitlement-gated streaming route exists at `/api/media/:productId/stream`.
- Buyer downloads: authenticated entitlement-gated download route exists at `/api/media/:productId/download`; responses use attachment semantics, private/no-store caching and support validated byte ranges for resumable downloads.
- Media streaming: HTTP byte-range parsing and `206 Partial Content` response handling are implemented.
- Storage: provider-neutral storage boundary plus secure local filesystem adapter exists for development/testing.
- Startup: protected-media security configuration is validated before the server starts; `MEDIA_URL_SECRET` must be at least 32 characters and a private media directory must be configured.
- Regression tests: backend/security workflow and media/security unit tests have been added; download authorization/attachment/range behavior now has dedicated regression coverage.
- Documentation: installation/deployment manual, buyer/seller/admin acceptance requirements, handoff guide and operations-manual outline exist.
- Buyer UI: Library and Order History are connected to localized authenticated API boundaries; final end-to-end acceptance still remains.
- Seller UI: new `storefront/seller.html` foundation is committed. It authenticates against `/api/seller/products`, lists seller products, supports language selection (en/ja), and creates a product draft through the authenticated seller API.
- Continuation: this file is the authoritative project state and must be updated after every meaningful milestone.

## Completed technical milestones in the current media-security/commerce phase
- Connected protected media route to the main API server.
- Added startup integration contracts for route registration and webhook/parser ordering.
- Added entitlement-gated media streaming boundary.
- Added safe byte-range parser for full, bounded, open-ended and suffix ranges.
- Connected byte ranges to the media stream route.
- Added validated range forwarding at the storage boundary.
- Added secure local media storage adapter with path traversal protection.
- Added explicit media storage provider factory.
- Wired configured media storage into server startup.
- Added startup security configuration validation.
- Added repository safeguards for `.env` and private media.
- Added payment webhook signature verification and settlement boundary.
- Added idempotent payment settlement and entitlement grant.
- Enforced purchased video access.
- Added short-lived secure media delivery tokens and signed URL verification/delivery foundations.
- Added authenticated buyer download route with range support and regression tests.
- Strengthened installation and production acceptance documentation.
- Added Seller Dashboard UI foundation and connected product listing/product draft creation to the existing authenticated Seller API.

## Important architecture decisions
- Centrally operated marketplace with multiple independent sellers.
- One-time sales, bundles/sets, free/paid videos and discounts; no monthly membership at this stage.
- Streaming and download support. A purchaser must be able to view and download purchased videos subject to the product/operator download policy.
- Multi-currency and multilingual architecture.
- Seller registration, verification, upload, review, sales and payout management are first-class functionality.
- Safety/moderation, reporting, takedown/removal, account controls, auditability and region restrictions are architectural requirements.
- Buyer conversion prioritizes clarity and trust without deceptive patterns.
- Admin must be usable from smartphone and desktop and routine operation must require no programming, SQL, shell or config-file editing.
- Video assets must remain in private storage; authorization must happen before media access.
- Payment integrations must remain replaceable/configurable and raw card details must never be stored.
- Adult content is not assumed universally legal or supported by every provider; actual launch jurisdictions and provider policies must be verified before production.
- Eventual self-hosted ZIP distribution is a product deliverable; never ship secrets or private project data.

## Known issues / risks
- Frontend shell still uses hash routes and is not yet a production router.
- Product detail currently uses demo data and checkout/product flows still require end-to-end database-backed integration and production UI wiring.
- Buyer library/account UI is not yet fully connected to authenticated backend purchase state and download controls.
- Seller dashboard currently provides product listing and draft creation, but video upload, product editing, publish/unpublish, seller onboarding/verification, sales/earnings and payouts still need UI integration and acceptance testing.
- PostgreSQL environment still needs clean provisioning and end-to-end testing.
- Authentication/session persistence, region controls and complete payout lifecycle still need completion and integration testing.
- No production object-storage provider, video processing pipeline or CDN is connected yet.
- Signed delivery exists as a security foundation, but production-grade download-token lifecycle/revocation/audit controls still need completion if signed-download delivery is selected for production.
- Locale production build tooling and human translation review remain.
- Payment-provider/content-policy compatibility must be verified before live credentials, especially for adult content.
- Japan-specific tax, invoicing, consumer-protection and privacy requirements must be reviewed for actual launch.
- Commercial ZIP is not yet ready; clean-install, upgrade, backup/restore, licensing and final acceptance testing remain.

## Next step
**Connect Seller Dashboard to the authenticated video upload API, then add seller product edit/publish/unpublish controls and seller onboarding/verification screens.** After Seller flows are stable, complete no-code admin moderation/approval actions, then production media delivery, object storage/CDN, end-to-end payment/database testing and final production acceptance.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions, known issues/risks and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**
