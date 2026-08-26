# Video Marketplace Project State

## Purpose
A reusable, international video marketplace inspired by the usability of Japanese video marketplaces such as Pancolle Movie, but independently designed and implemented. The platform must work for general video sales and be capable of supporting adult content where legally and operationally permitted.

## Current milestone
**Milestone 368 — Authenticated buyer video download route, resumable download support, regression coverage and strengthened installation/production acceptance documentation completed.**

## Current status
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Frontend: polished responsive storefront prototype, localized application shell, buyer/seller/admin UI foundations.
- Backend: Node/Express/PostgreSQL foundation with security headers, health endpoint, catalog/product/order/checkout boundaries and payment webhook handling.
- Commerce: hosted checkout boundary, verified payment webhook settlement, idempotent entitlement grant and seller settlement records are implemented at the service/boundary level.
- Protected media: authenticated entitlement-gated streaming route exists at `/api/media/:productId/stream`.
- Buyer downloads: authenticated entitlement-gated download route exists at `/api/media/:productId/download`; responses use attachment semantics, private/no-store caching and support validated byte ranges for resumable downloads.
- Media streaming: HTTP byte-range parsing and `206 Partial Content` response handling are implemented.
- Storage: provider-neutral storage boundary plus secure local filesystem adapter exists for development/testing.
- Storage configuration: explicit provider factory defaults to `local` and rejects unknown providers instead of silently falling back.
- Startup: protected-media security configuration is validated before the server starts; `MEDIA_URL_SECRET` must be at least 32 characters and a private media directory must be configured.
- Repository hygiene: `.gitignore` excludes environment secrets, local private media, dependencies, logs and editor files.
- Regression tests: backend/security workflow and media/security unit tests have been added; download authorization/attachment/range behavior now has dedicated regression coverage.
- Documentation: installation/deployment manual now includes infrastructure prerequisites, environment, database, buyer/seller/admin acceptance tests, media security checks, payment acceptance, production deployment and rollback/launch gates.
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
- Seller/admin dashboards are UI foundations and are not fully connected to authenticated backend operations.
- PostgreSQL environment still needs clean provisioning and end-to-end testing.
- Authentication/session persistence, region controls and complete payout lifecycle still need completion and integration testing.
- No production object-storage provider, video processing pipeline or CDN is connected yet.
- Signed delivery exists as a security foundation, but production-grade download-token lifecycle/revocation/audit controls still need completion if signed-download delivery is selected for production.
- Locale production build tooling and human translation review remain.
- Payment-provider/content-policy compatibility must be verified before live credentials, especially for adult content.
- Japan-specific tax, invoicing, consumer-protection and privacy requirements must be reviewed for actual launch.
- Commercial ZIP is not yet ready; clean-install, upgrade, backup/restore, licensing and final acceptance testing remain.

## Next step
**Implement and connect authenticated buyer purchase/library state end-to-end, including purchase history and buyer-facing watch/download controls, then complete the seller onboarding/upload workflow and no-code admin moderation/approval actions.** After those flows are stable, complete production private-media signed download lifecycle, object storage/CDN integration, end-to-end payment/database testing, and final production acceptance.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions, known issues/risks and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**
