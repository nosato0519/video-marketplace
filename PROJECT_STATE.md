# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 406 — PostgreSQL acceptance failures isolated and hardened for the next CI run.**

## Current status
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Public catalog/detail excludes products with a blocked moderation review.
- Purchased media access rejects unpublished/blocked products.
- Admin content moderation API/UI exists for reviews, reports and Takedown.
- Buyer product detail exposes a Report this content form and authenticated report API.
- Moderation actions are audited through `audit_events`.
- Backend Regression runs `npm install`, migration preflight and `npm test`.
- Protected media route injects its context reader, allowing HTTP-boundary tests without PostgreSQL.
- Media download/protected-media fixtures include required product-to-asset and entitlement ownership fields.
- Payment checkout validation restores the established `checkout_*` error contract and rejects mismatched order metadata.
- Payment-provider settings tests use the owner-scoped API and correct return shapes.
- Owner payment-routing test uses isolated test-only Stripe configuration.
- Existing `005_reports.sql` is preserved as legacy and is not modified.
- `013_content_moderation.sql` defines the canonical `content_reviews` and `content_reports` tables required by current moderation code.
- `backend/scripts/migrate.js` provides deterministic numbered PostgreSQL migration execution, tracks applied files in `schema_migrations`, runs each migration transactionally and uses a PostgreSQL advisory lock to serialize concurrent migration processes.
- `npm run migrate` is exposed in the backend package scripts.
- `npm run migrate:preflight` validates the migration set without incorrectly rejecting legitimate repeated version numbers.
- `017_migration_legacy_policy.sql` records the canonical purchase migration and the rule that the historical purchase migration requires review before replay against populated databases.
- HTTP moderation acceptance uses the real Express app, real session-cookie lookup, buyer/admin authorization, report processing and takedown flow.
- HTTP moderation acceptance creates canonical seller/profile/product/translation/session fixtures.
- Duplicate-report acceptance uses a PostgreSQL SAVEPOINT so the expected unique-constraint failure does not abort the surrounding transaction.
- Public catalog/detail queries use `users.status = 'active'` rather than a nonexistent `seller_profiles.status` column.
- HTTP moderation acceptance verifies a published product is visible before takedown and returns 404 / disappears from the public catalog after a blocked review is created.
- PostgreSQL acceptance workflow runs migration preflight, migration plan, migrations twice, DB moderation acceptance and HTTP moderation acceptance.
- `content-report-routes.js` uses the canonical `seller_profiles.user_id = products.seller_id` relationship and `users.status = 'active'` seller availability check.
- Public catalog returns the canonical seller user ID (`seller_profiles.user_id`).
- Buyer Library SQL now uses canonical product pricing fields (`price_amount`, `price_currency`) and canonical product delivery flags (`streaming_enabled`, `download_enabled`).
- Buyer Library excludes unpublished and blocked products even when an active entitlement remains.
- Order History SQL now uses canonical order ownership (`buyer_id`) and amount (`amount`) fields.
- `018_canonical_commerce_columns.sql` adds the missing canonical `payment_reference`, `refund_reference`, `updated_at`, `streaming_enabled` and `download_enabled` columns on fresh or existing installations without touching legacy purchase tables.
- `commerce-db-acceptance.js` covers pending order creation, paid completion, entitlement issuance, buyer Library visibility, non-buyer denial, protected-media authorization, blocked-product denial, refund/revocation and post-refund Library/access denial.
- `npm run test:commerce-db` is registered and the PostgreSQL acceptance workflow runs it on fresh PostgreSQL after migrations.
- The latest PostgreSQL Acceptance run (#22) proved migration preflight, migration plan, both migration passes, commerce DB acceptance and moderation DB acceptance all succeed.
- That run failed only at HTTP moderation acceptance because the workflow did not provide the required media security environment configuration; the logs also exposed a duplicate-report unique-index race at the database boundary.
- `content-report-routes.js` is now hardened with `ON CONFLICT ... DO NOTHING` plus an explicit 409 response so the duplicate-report API remains deterministic even under a concurrent request race.
- PostgreSQL Acceptance workflow now supplies a test-only `MEDIA_URL_SECRET` and `/tmp/video-marketplace-media` to the HTTP acceptance step. No production secret is stored in the repository.

## Latest verified CI baseline
Backend Regression run **#369** completed with **success** after the commerce DB acceptance script was registered. PostgreSQL Acceptance run **#22** completed with failure, but the failure was isolated after the migration and commerce portions passed.

## CI verification note
The next PostgreSQL Acceptance run must be inspected after the latest fixes. Do not mark the milestone Green until an accessible run/job result confirms HTTP moderation acceptance and the complete workflow succeed.

## Important unresolved technical boundary
`001_purchase_flow.sql` historically creates BIGINT purchase tables, while `003_orders_entitlements.sql` defines the current UUID-based canonical `orders` / `entitlements` model. The current migration tree also preserves this legacy history. No destructive conversion or DROP has been performed.

## Remaining work
- Verify the next PostgreSQL acceptance workflow end-to-end on a fresh PostgreSQL database and inspect actual job logs/results.
- Verify migration idempotency and concurrent execution against PostgreSQL.
- Decide and implement the safe fresh-install/legacy-install migration split for the historical purchase schema.
- Re-run and complete HTTP moderation acceptance after the media security and duplicate-report fixes.
- Extend DB-backed integration coverage for buyer report creation, Admin report processing, Takedown and blocked catalog/detail/media access.
- Complete production authentication/session, privacy/account controls, region restrictions and PostgreSQL acceptance testing.
- Complete payment/provider production compatibility review.
- Finish clean-install, backup/restore, licensing, documentation and commercial ZIP acceptance testing.
- After backend acceptance is Green, continue the end-to-end purchase → payment-provider → paid order → entitlement → Library → protected media path and then the buyer/seller UI integration.

## Next step
**Verify the new PostgreSQL Acceptance run after the two fixes, inspect the complete job result, and repair any remaining HTTP moderation or media-access failure before moving deeper into production payment and buyer/seller UI integration.**

## Progress memo rule
After each meaningful milestone or discovered failure, update this file with what was completed, what remains, the important technical decision, and the exact next step. Do not claim CI success without a verifiable run result.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**
