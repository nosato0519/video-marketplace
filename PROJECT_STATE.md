# Video Marketplace Project State

## Purpose
A reusable, international video marketplace inspired by the usability of Japanese video marketplaces such as Pancolle Movie, but independently designed and implemented. The platform must work for general video sales and be capable of supporting adult content where legally and operationally permitted.

## Current milestone
**Milestone 276 — Protected private-media streaming foundation, explicit storage configuration, startup security validation and Git secret/media safeguards completed.**

## Current status
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Frontend: polished responsive storefront prototype, localized application shell, buyer/seller/admin UI foundations.
- Backend: Node/Express/PostgreSQL foundation with security headers, health endpoint, catalog/product/order/checkout boundaries and payment webhook handling.
- Protected media: authenticated entitlement-gated streaming route exists at `/api/media/:productId/stream`.
- Media streaming: HTTP byte-range parsing and `206 Partial Content` response handling are implemented.
- Storage: provider-neutral storage boundary plus secure local filesystem adapter exists for development/testing.
- Storage configuration: explicit provider factory defaults to `local` and rejects unknown providers instead of silently falling back.
- Startup: protected-media security configuration is validated before the server starts; `MEDIA_URL_SECRET` must be at least 32 characters and a private media directory must be configured.
- Repository hygiene: `.gitignore` excludes environment secrets, local private media, dependencies, logs and editor files.
- Regression tests: backend/security workflow and media/security unit tests have been added; GitHub Actions runs backend tests on backend changes.
- Continuation: this file is the authoritative project state and must be updated after every meaningful milestone.

## Completed technical milestones in the current media-security phase
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
- Added/updated tests for the above boundaries.

## Important architecture decisions
- Centrally operated marketplace with multiple independent sellers.
- One-time sales, bundles/sets, free/paid videos and discounts; no monthly membership at this stage.
- Streaming and download support.
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
- Product detail currently uses demo data and placeholder sandbox checkout; live payment provider is not connected.
- Seller/admin dashboards are UI foundations and are not fully connected to authenticated backend operations.
- PostgreSQL environment still needs clean provisioning and end-to-end testing.
- Authentication, region controls and complete payout lifecycle still need completion and integration testing.
- No production object-storage provider, video processing pipeline or CDN is connected yet.
- Media stream route currently depends on the local storage/provider-neutral boundary; production object storage adapter remains to be implemented.
- Download-token lifecycle and production-grade signed delivery still need completion.
- Locale production build tooling and human translation review remain.
- Payment-provider/content-policy compatibility must be verified before live credentials, especially for adult content.
- Japan-specific tax, invoicing, consumer-protection and privacy requirements must be reviewed for actual launch.
- Commercial ZIP is not yet ready; clean-install, upgrade, backup/restore, licensing and final acceptance testing remain.

## Next step
**Implement the provider-neutral product-detail API and sandbox checkout boundary, then connect authenticated buyer purchase/library state.** After that, continue seller onboarding/upload workflow and no-code admin moderation/approval actions. Complete production private-media delivery/download-token lifecycle only after authorization, storage and commerce tests are stable. Maintain regression coverage and update this file after each milestone.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions, known issues/risks and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**
