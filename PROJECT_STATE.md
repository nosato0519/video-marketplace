# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 416 — HTTP payment webhook acceptance fixture aligned with the canonical payment ledger; fresh CI verification triggered.**

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
- `019_canonical_categories.sql` adds the canonical categories table and product foreign key.
- `020_canonical_product_download_policy.sql` adds `download_limit` and `download_expiry_seconds` safely and additively.
- The workflow supplies test-only media and webhook secrets; no production secret is stored in the repository.
- `backend/scripts/migration-concurrency-acceptance.js` starts four concurrent migration processes and verifies all exit successfully, no duplicate migration records exist and the legacy purchase migration remains explicitly skipped on fresh installs.
- `backend/scripts/migrate.js` detects an existing `public.orders.id` BIGINT schema when the canonical UUID purchase migration is still unapplied and fails closed. It never attempts an automatic destructive BIGINT→UUID conversion.
- `legacy-purchase-migration-acceptance.js` verifies the legacy BIGINT schema is left unchanged and no migration records are written when the guard triggers.
- `webhook-routes.js` provides provider webhook routing, signature verification, payment event idempotency and payment completion/refund handling.
- `backend/scripts/http-payment-webhook-acceptance.js` exercises the real Express HTTP webhook boundary against PostgreSQL using the canonical `/api/payments/webhook` route, canonical camelCase payload, non-null provider payment ID, idempotent delivery and rejection checks.
- `npm run test:http-payment-webhook` is registered in `backend/package.json`.
- PostgreSQL Acceptance workflow runs the HTTP payment webhook acceptance after the legacy migration safety acceptance.

## Latest verified CI baseline
PostgreSQL Acceptance Run #43 completed the migration, Commerce, Moderation, HTTP Moderation, four concurrent migration runners and Legacy BIGINT safety acceptance successfully, but failed at HTTP payment webhook acceptance because its older fixture inserted NULL `payments.provider_payment_id`. A later run used an intermediate fixture and also failed before the current corrected fixture was present. The current `main` fixture now supplies `provider_payment_id`, `user_id`, `idempotency_key`, the canonical `/api/payments/webhook` route and canonical camelCase event fields. **Fresh verification is still required; no Green claim is made yet.**

## Important unresolved technical boundary
`001_purchase_flow.sql` historically creates BIGINT purchase tables, while `003_orders_entitlements.sql` defines the current UUID-based canonical `orders` / `entitlements` model. Fresh installs skip the legacy purchase migration and use the canonical UUID schema. Existing installations with the legacy BIGINT purchase schema are deliberately blocked before replay of the canonical purchase migration. **No automatic conversion exists yet; a reviewed, backed-up legacy-to-canonical data migration is still required for those installations.**

## Remaining work
- Verify a fresh PostgreSQL Acceptance run using the corrected HTTP payment webhook fixture and current webhook implementation.
- Add/verify refund and failed-payment HTTP webhook acceptance after the success path is Green.
- Design and implement a reviewed BIGINT→UUID legacy purchase data migration only after backup/restore and rollback strategy is defined.
- Extend DB-backed integration coverage for buyer report creation, Admin report processing, Takedown and blocked catalog/detail/media access.
- Complete production authentication/session, privacy/account controls, region restrictions and PostgreSQL acceptance testing.
- Complete payment/provider production compatibility review.
- Finish clean-install, backup/restore, licensing, documentation and commercial ZIP acceptance testing.
- After payment acceptance is Green, continue the end-to-end buyer purchase → Library → protected media path and then buyer/seller UI integration.

## Next step
**Inspect the fresh PostgreSQL Acceptance run triggered from this saved state. If the HTTP payment webhook step passes, add failed/refunded HTTP webhook acceptance and then continue the end-to-end buyer purchase → Library → protected media integration. If it fails, fix only the concrete failing boundary and re-run.**

## Progress memo rule
After each meaningful milestone or discovered failure, update this file with what was completed, what remains, the important technical decision, and the exact next step. Do not claim CI success without a verifiable run result.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**
