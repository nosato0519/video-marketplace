# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 392 — Canonical moderation database schema added.**

## Current status
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Public catalog/detail excludes products with a blocked moderation review.
- Purchased media access rejects unpublished/blocked products.
- Admin content moderation API/UI exists for reviews, reports and Takedown.
- Buyer product detail exposes a Report this content form and authenticated report API.
- Moderation actions are audited through `audit_events`.
- Backend Regression previously verified Green on main before this schema-only change.
- Protected media route injects its context reader, allowing HTTP-boundary tests without PostgreSQL.
- Media download/protected-media fixtures include required product-to-asset and entitlement ownership fields.
- Payment checkout validation restores the established `checkout_*` error contract and rejects mismatched order metadata.
- Payment-provider settings tests use the owner-scoped API and correct return shapes.
- Owner payment-routing test uses isolated test-only Stripe configuration.
- Existing `005_reports.sql` defines the older generic `reports` table; it is preserved as legacy data and is not modified.
- New `013_content_moderation.sql` defines the canonical `content_reviews` and `content_reports` tables required by the current moderation application code, including product/user foreign keys, status constraints, indexes, and a partial unique index preventing duplicate open/reviewing reports per reporter/product.

## Latest verified CI baseline
Backend Regression run **#324** (`33036690023`) tested commit `636066a6e6a26726d392b7b2429f475988c59459` on `main` and completed with **success**. Its regression job and `npm test` step both completed successfully. The new migration must receive a fresh CI run before this milestone is considered regression-verified.

## Remaining work
- Verify the new moderation migration with a fresh CI run and database migration/acceptance environment.
- Add DB-backed integration coverage for buyer report creation, Admin report processing, Takedown and blocked catalog/detail/media access.
- Complete production authentication/session, privacy/account controls, region restrictions and PostgreSQL acceptance testing.
- Complete product checkout/library end-to-end testing and production payment/provider compatibility review.
- Finish clean-install, backup/restore, licensing, documentation and commercial ZIP acceptance testing.

## Next step
**Run and verify the new moderation migration against the project's database setup, then add DB-backed moderation integration tests. Do not declare the migration verified until CI/database acceptance confirms it.**

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**