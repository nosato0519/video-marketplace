# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 409 — Duplicate-report PostgreSQL conflict target aligned with the canonical partial unique index; awaiting fresh acceptance verification.**

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
- PostgreSQL Acceptance run #24 proved migration preflight, migration plan, both migration passes, commerce DB acceptance and moderation DB acceptance all succeed.
- Run #24 failed at HTTP moderation because `product-detail-policy.js` referenced a `categories` table that did not exist in the canonical migration tree; migration `019_canonical_categories.sql` was then added.
- Run #25 proved migrations including 019, Commerce DB and Moderation DB acceptance, but HTTP moderation failed because `products.download_limit` and `products.download_expiry_seconds` were missing.
- `020_canonical_product_download_policy.sql` adds those product delivery-policy columns with safe nullable defaults and positive-value checks. It is additive and does not touch legacy purchase tables.
- The workflow supplies a test-only `MEDIA_URL_SECRET` and `/tmp/video-marketplace-media` to the HTTP acceptance step. No production secret is stored in the repository.
- Run #27 used the latest main commit and applied migration 020, but HTTP moderation failed because the `ON CONFLICT` target in `content-report-routes.js` did not exactly match the canonical partial unique index predicate.
- `content-report-routes.js` now uses `ON CONFLICT (product_id, reporter_id) WHERE status IN ('open','reviewing') AND reporter_id IS NOT NULL DO NOTHING`, matching the canonical index predicate and preserving deterministic 409 duplicate-report behavior.
- Backend Regression had previously completed successfully with 165 passed and 0 failed; this conflict-target change now requires fresh regression/acceptance verification.

## Latest verified CI baseline
Backend Regression run **#372** completed with success (165 passed, 0 failed). PostgreSQL Acceptance run **#27** used the latest main at the time and failed only at HTTP moderation due to the conflict-target mismatch described above. The conflict-target fix is now committed as `b8998e5edf9495f78fffdee0efbb766e300a3800`; that commit has not yet been validated by a fresh PostgreSQL Acceptance run.

## CI verification note
Do not mark the acceptance milestone Green until a fresh PostgreSQL Acceptance run validates the conflict-target fix and completes HTTP moderation successfully.

## Important unresolved technical boundary
`001_purchase_flow.sql` historically creates BIGINT purchase tables, while `003_orders_entitlements.sql` defines the current UUID-based canonical `orders` / `entitlements` model. The current migration tree preserves this legacy history. No destructive conversion or DROP has been performed.

## Remaining work
- Run and verify fresh PostgreSQL acceptance after commit `b8998e5...` and inspect actual job logs/results.
- Verify migration idempotency and concurrent execution against PostgreSQL.
- Decide and implement the safe fresh-install/legacy-install migration split for the historical purchase schema.
- Extend DB-backed integration coverage for buyer report creation, Admin report processing, Takedown and blocked catalog/detail/media access.
- Complete production authentication/session, privacy/account controls, region restrictions and PostgreSQL acceptance testing.
- Complete payment/provider production compatibility review.
- Finish clean-install, backup/restore, licensing, documentation and commercial ZIP acceptance testing.
- After backend acceptance is Green, continue the end-to-end purchase → payment-provider → paid order → entitlement → Library → protected media path and then the buyer/seller UI integration.

## Next step
**Verify a fresh PostgreSQL Acceptance run for commit `b8998e5...`. If HTTP moderation passes, proceed to migration idempotency/concurrency verification; if another schema/runtime gap appears, isolate it from the actual job logs, fix it additively, update this state file, and re-run before moving to production payment and buyer/seller UI integration.**

## Progress memo rule
After each meaningful milestone or discovered failure, update this file with what was completed, what remains, the important technical decision, and the exact next step. Do not claim CI success without a verifiable run result.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**
