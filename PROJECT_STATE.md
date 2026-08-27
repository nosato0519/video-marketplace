# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 412 — Dedicated legacy purchase-schema safety acceptance added; awaiting CI verification.**

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
- PostgreSQL acceptance workflow runs migration preflight, migration plan, migrations twice, Commerce DB acceptance and Moderation acceptance.
- `content-report-routes.js` uses the canonical `seller_profiles.user_id = products.seller_id` relationship and `users.status = 'active'` seller availability check.
- Public catalog returns the canonical seller user ID (`seller_profiles.user_id`).
- Buyer Library SQL now uses canonical product pricing fields (`price_amount`, `price_currency`) and canonical product delivery flags (`streaming_enabled`, `download_enabled`).
- Buyer Library excludes unpublished and blocked products even when an active entitlement remains.
- Order History SQL now uses canonical order ownership (`buyer_id`) and amount (`amount`) fields.
- `018_canonical_commerce_columns.sql` adds the missing canonical `payment_reference`, `refund_reference`, `updated_at`, `streaming_enabled` and `download_enabled` columns on fresh or existing installations without touching legacy purchase tables.
- `commerce-db-acceptance.js` covers pending order creation, paid completion, entitlement issuance, buyer Library visibility, non-buyer denial, protected-media authorization, blocked-product denial, refund/revocation and post-refund Library/access denial.
- `npm run test:commerce-db` is registered and the PostgreSQL acceptance workflow runs it on fresh PostgreSQL after migrations.
- Run #24 proved migration preflight, migration plan, both migration passes, Commerce DB acceptance and Moderation DB acceptance; HTTP moderation exposed the missing canonical `categories` table.
- `019_canonical_categories.sql` adds the canonical categories table and product foreign key.
- Run #25 exposed missing product delivery-policy columns; `020_canonical_product_download_policy.sql` added `download_limit` and `download_expiry_seconds` safely and additively.
- The workflow supplies a test-only `MEDIA_URL_SECRET` and `/tmp/video-marketplace-media` to the HTTP acceptance step. No production secret is stored in the repository.
- Run #27 exposed a mismatch between the content-report partial unique index predicate and the `ON CONFLICT` target; `content-report-routes.js` was corrected to match the canonical predicate exactly.
- Backend Regression previously completed successfully with 165 passed and 0 failed.
- PostgreSQL Acceptance Run #32 completed successfully, including migrations, Commerce DB, Moderation DB, HTTP Moderation and four concurrent migration runners, with no duplicate `schema_migrations` rows.
- `backend/scripts/migration-concurrency-acceptance.js` starts four concurrent migration processes and verifies all exit successfully, no duplicate migration records exist and the legacy purchase migration remains explicitly skipped on fresh installs.
- `backend/scripts/migrate.js` detects an existing `public.orders.id` BIGINT schema when the canonical UUID purchase migration is still unapplied and fails closed. It never attempts an automatic destructive BIGINT→UUID conversion.
- A dedicated `legacy-purchase-migration-acceptance.js` test now creates an isolated PostgreSQL database with a representative BIGINT `orders` table and row, runs the real migration command expecting a fail-closed legacy-schema error, verifies the legacy row is unchanged and verifies no `schema_migrations` records were written.
- `npm run test:legacy-purchase-migration` is registered and PostgreSQL Acceptance now runs the dedicated legacy safety test after the fresh-install/concurrency checks.

## Latest verified CI baseline
PostgreSQL Acceptance Run **#32** completed successfully with all fresh-install acceptance stages green, including four concurrent migration runners and no duplicate migration records. The latest commits `960f72d...`, `3d7dcec...`, and `911fba6...` add the dedicated legacy safety test, package script, and workflow integration; the combined latest state has not yet received a fresh Acceptance result.

## Important unresolved technical boundary
`001_purchase_flow.sql` historically creates BIGINT purchase tables, while `003_orders_entitlements.sql` defines the current UUID-based canonical `orders` / `entitlements` model. Fresh installs skip the legacy purchase migration and use the canonical UUID schema. Existing installations with the legacy BIGINT purchase schema are deliberately blocked before replay of the canonical purchase migration. **No automatic conversion exists yet; a reviewed, backed-up legacy-to-canonical data migration is still required for those installations.**

## Remaining work
- Verify the new dedicated legacy-schema acceptance test and the full fresh PostgreSQL acceptance on the latest main.
- Design and implement a reviewed BIGINT→UUID legacy purchase data migration, including orders, entitlements and payment-event reconciliation, only after backup/restore and rollback strategy is defined.
- Extend DB-backed integration coverage for buyer report creation, Admin report processing, Takedown and blocked catalog/detail/media access.
- Complete production authentication/session, privacy/account controls, region restrictions and PostgreSQL acceptance testing.
- Complete payment/provider production compatibility review.
- Finish clean-install, backup/restore, licensing, documentation and commercial ZIP acceptance testing.
- After backend acceptance is Green, continue the end-to-end purchase → payment-provider → paid order → entitlement → Library → protected media path and then the buyer/seller UI integration.

## Next step
**Run and inspect fresh PostgreSQL Acceptance on the latest main. If the dedicated legacy test passes, preserve that guard as the safety boundary and move to the reviewed BIGINT→UUID migration design plus end-to-end purchase-flow integration. If the test exposes an issue, fix it additively and re-run before touching production purchase data.**

## Progress memo rule
After each meaningful milestone or discovered failure, update this file with what was completed, what remains, the important technical decision, and the exact next step. Do not claim CI success without a verifiable run result.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**
