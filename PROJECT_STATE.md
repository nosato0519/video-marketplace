# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 408 — Product download-policy schema gap isolated and fixed after HTTP moderation acceptance exposed missing product delivery columns.**

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
- PostgreSQL Acceptance run #25 used the latest code available to that run and proved migrations (including 019), Commerce DB and Moderation DB acceptance all succeed. HTTP moderation still failed because the product detail query also referenced missing `products.download_limit` and `products.download_expiry_seconds` columns.
- `020_canonical_product_download_policy.sql` now adds those product delivery-policy columns with safe nullable defaults and positive-value checks. It is additive and does not touch legacy purchase tables.
- The duplicate-report unique-constraint log line remains an expected duplicate/race boundary event; the API acceptance path is designed to turn the duplicate into deterministic 409 behavior.
- The workflow supplies a test-only `MEDIA_URL_SECRET` and `/tmp/video-marketplace-media` to the HTTP acceptance step. No production secret is stored in the repository.

## Latest verified CI baseline
Backend Regression run **#371** completed with **success**. PostgreSQL Acceptance run **#25** completed with failure only at HTTP moderation acceptance; migrations (including 019) and DB acceptance stages were successful. The latest main branch now contains migration 020, so run #25 is not a validation of migration 020.

## CI verification note
Do not mark the acceptance milestone Green yet. A fresh PostgreSQL Acceptance run must verify migration 020 and complete HTTP moderation acceptance successfully.

## Important unresolved technical boundary
`001_purchase_flow.sql` historically creates BIGINT purchase tables, while `003_orders_entitlements.sql` defines the current UUID-based canonical `orders` / `entitlements` model. The current migration tree preserves this legacy history. No destructive conversion or DROP has been performed.

## Remaining work
- Verify a fresh PostgreSQL acceptance workflow end-to-end after migration 020 and inspect actual job logs/results.
- Verify migration idempotency and concurrent execution against PostgreSQL.
- Decide and implement the safe fresh-install/legacy-install migration split for the historical purchase schema.
- Complete HTTP moderation acceptance after the product download-policy schema fix.
- Extend DB-backed integration coverage for buyer report creation, Admin report processing, Takedown and blocked catalog/detail/media access.
- Complete production authentication/session, privacy/account controls, region restrictions and PostgreSQL acceptance testing.
- Complete payment/provider production compatibility review.
- Finish clean-install, backup/restore, licensing, documentation and commercial ZIP acceptance testing.
- After backend acceptance is Green, continue the end-to-end purchase → payment-provider → paid order → entitlement → Library → protected media path and then the buyer/seller UI integration.

## Next step
**Verify the fresh PostgreSQL Acceptance run containing migration 020. If HTTP moderation passes, proceed to migration idempotency/concurrency verification; if another schema/runtime gap appears, isolate it from the actual job logs, fix it additively, update this state file, and re-run before moving to production payment and buyer/seller UI integration.**

## Progress memo rule
After each meaningful milestone or discovered failure, update this file with what was completed, what remains, the important technical decision, and the exact next step. Do not claim CI success without a verifiable run result.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**
