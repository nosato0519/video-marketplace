# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 423 — Seller profile, earnings and payout API surface reviewed; authenticated HTTP acceptance is the next implementation step.**

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
- Buyer Library SQL uses canonical product pricing fields (`price_amount`, `price_currency`) and canonical product delivery flags (`streaming_enabled`, `download_enabled`).
- Buyer Library excludes unpublished and blocked products even when an active entitlement remains.
- Order History SQL uses canonical order ownership (`buyer_id`) and amount (`amount`) fields.
- `018_canonical_commerce_columns.sql` adds the missing canonical `payment_reference`, `refund_reference`, `updated_at`, `streaming_enabled` and `download_enabled` columns on fresh or existing installations without touching legacy purchase tables.
- `commerce-db-acceptance.js` covers pending order creation, paid completion, entitlement issuance, buyer Library visibility, non-buyer denial, protected-media authorization, blocked-product denial, refund/revocation and post-refund Library/access denial.
- `npm run test:commerce-db` is registered and the PostgreSQL acceptance workflow runs it on fresh PostgreSQL after migrations.
- `019_canonical_categories.sql` adds the canonical categories table and product foreign key.
- `020_canonical_product_download_policy.sql` adds `download_limit` and `download_expiry_seconds` safely and additively.
- The workflow supplies test-only media and webhook secrets; no production secret is stored in the repository.
- `backend/scripts/migration-concurrency-acceptance.js` starts four concurrent migration processes and verifies all exit successfully, no duplicate migration records exist and the legacy purchase migration remains explicitly skipped on fresh installs.
- `backend/scripts/migrate.js` detects an existing `public.orders.id` BIGINT schema when the canonical purchase migration is still unapplied and fails closed. It never attempts an automatic destructive BIGINT→UUID conversion.
- `legacy-purchase-migration-acceptance.js` verifies the legacy BIGINT schema is left unchanged and no migration records are written when the guard triggers.
- `webhook-routes.js` provides provider webhook routing, signature verification, payment event idempotency and payment completion/refund/failed handling.
- `webhook-payload.js` is the canonical HTTP contract: `eventId`, `provider`, `eventType`, `paymentId`, `orderId` are required strings; successful events additionally require numeric `amount`, 3-letter `currency` and `status = succeeded`.
- `webhook-routes.js` maps the canonical external `paymentId` into the internal `providerPaymentId` fields before payment completion.
- `complete-payment.js` verifies the webhook payment against the locked order/payment records, rejects amount/currency/provider-payment mismatches, transitions the order to `paid`, marks the payment `succeeded`, and issues an entitlement idempotently.
- `refund-payment.js` verifies the recorded refund event, requires `paid -> refunded`, revokes the active entitlement and processes duplicate refunds idempotently.
- `fail-payment.js` verifies the recorded failed event, locks the order/payment, transitions `pending -> cancelled`, marks the payment `failed`, processes the event and handles duplicate delivery idempotently.
- `backend/scripts/http-payment-webhook-acceptance.js` exercises the real Express HTTP webhook boundary against PostgreSQL using the canonical `/api/payments/webhook` route, canonical payload, non-null provider payment ID, idempotent delivery and rejection checks.
- `backend/scripts/http-payment-refund-acceptance.js` exercises a real successful payment followed by `payment_refunded`, verifies `paid -> refunded`, entitlement revocation, processed event ledger state and idempotent refund redelivery.
- `backend/scripts/http-payment-failed-acceptance.js` exercises the real HTTP failed-payment webhook, verifies payment `failed`, order `cancelled`, no entitlement, processed event ledger state and duplicate redelivery idempotently.
- `npm run test:http-payment-webhook`, `npm run test:http-payment-refund` and `npm run test:http-payment-failed` are registered in `backend/package.json`.
- PostgreSQL Acceptance Run #74 passed all migration, Commerce, Moderation, HTTP Moderation, concurrency, legacy safety, successful-payment, refund, failed-payment, buyer purchase → Library → protected-media E2E and seller media → product → publish → ownership-isolation E2E steps.
- `backend/scripts/http-buyer-purchase-e2e-acceptance.js` exercises the real Express API from an authenticated buyer session: POST pending order → insert provider payment fixture → signed payment-success webhook → paid order/entitlement → buyer Library → protected media download, plus non-buyer download denial.
- `npm run test:http-buyer-purchase-e2e` is registered in `backend/package.json` and the PostgreSQL Acceptance workflow runs it after the payment webhook acceptances.
- `backend/scripts/http-seller-product-media-e2e-acceptance.js` exercises the real Express API from an authenticated seller session: upload media → list owned media → create draft product → update product → publish → list/detail product, plus cross-seller product/media isolation and published-product update locking.
- `npm run test:http-seller-product-media-e2e` is registered in `backend/package.json` and the PostgreSQL Acceptance workflow runs it after the buyer purchase E2E.
- Seller product ownership now uses a concrete owner resolver with `requireOwner`, and cross-seller detail access intentionally returns 404 to avoid resource-existence leakage.
- `backend/scripts/http-buyer-order-report-e2e-acceptance.js` exercises authenticated buyer order history, buyer-to-order/product ownership isolation, content report creation, duplicate open-report rejection and independent reporting by another buyer.
- `npm run test:http-buyer-order-report-e2e` is registered in `backend/package.json`.
- PostgreSQL Acceptance workflow now runs the buyer order/report E2E after buyer purchase E2E and before seller E2E.
- Seller profile API exists for authenticated sellers: read profile, update display/legal/country information, and submit verification with state guards.
- Seller earnings API exists for authenticated sellers and returns aggregate earned/available/paid/refunded amounts plus recent earning records.
- Seller payout API exists for authenticated sellers and enforces positive amount/currency validation, available-balance limits, pending-payout limits and requested payout creation.
- Admin payout and seller-verification routes are already mounted in the application.

## Important unresolved technical boundary
`001_purchase_flow.sql` historically creates BIGINT purchase tables, while `003_orders_entitlements.sql` defines the current UUID-based canonical `orders` / `entitlements` model. Fresh installs skip the legacy purchase migration and use the canonical UUID schema. Existing installations with the legacy BIGINT purchase schema are deliberately blocked before replay of the canonical purchase migration. **No automatic conversion exists yet; a reviewed, backed-up legacy-to-canonical data migration is still required for those installations.**

## Remaining work
- Verify the fresh PostgreSQL Acceptance run for buyer order-history/reporting and fix only concrete failures.
- Add authenticated HTTP E2E coverage for seller profile read/update/verification state transitions.
- Add authenticated HTTP E2E coverage for seller earnings isolation and payout balance/pending-payout validation.
- Wire seller profile/earnings/payout flows into the Buyer/Seller UI and browser-level acceptance where practical.
- Extend DB-backed integration coverage for Admin report processing, Takedown and blocked catalog/detail/media access.
- Complete production authentication/session, privacy/account controls, region restrictions and PostgreSQL acceptance testing.
- Complete payment/provider production compatibility review.
- Design and implement a reviewed BIGINT→UUID legacy purchase data migration only after backup/restore and rollback strategy is defined.
- Finish clean-install, backup/restore, licensing, documentation and commercial ZIP acceptance testing.

## Next step
**Confirm Run #78 after the media-secret fix. Then add and run authenticated Seller profile + earnings/payout HTTP acceptance against fresh PostgreSQL. Repair concrete failures before UI integration.**

## Progress memo
- **Completed:** Core catalog/product/media, moderation/reporting, payment success/refund/failure, buyer purchase→Library→protected download, seller media/product/publish/ownership isolation, buyer order-history/reporting API/E2E scaffolding, seller profile/earnings/payout API surface.
- **In progress:** Fresh PostgreSQL verification of buyer order-history/reporting after CI environment-secret correction (Run #78).
- **Next:** Seller profile + earnings/payout HTTP E2E, then UI/browser acceptance.
- **Key decisions:** Keep cross-seller resource access at 404 to reduce existence leakage; never claim CI success without a completed run; keep legacy BIGINT purchase schema migration blocked until a reviewed backup/rollback plan exists.

## Progress memo rule
After each meaningful milestone or discovered failure, update this file with what was completed, what remains, the important technical decision, and the exact next step. Do not claim CI success without a verifiable run result.

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**
