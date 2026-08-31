# Project Progress Ledger

Last updated: 2026-08-31

## Rule: continue from existing work; do not waste time recreating it

Existing work must be inspected and reused before creating anything new. A completed item may be modified or repaired if a regression, integration issue, or later requirement proves it needs changes. However, never restart or recreate an already-built feature merely because the previous progress was forgotten or not recorded.

## Confirmed PASS

- Migration
- Migration state
- Backup / Restore
- Core regression
- Clean Install (latest confirmed run: #218)
- Authentication (historical Backend Regression PASS)
- Payment webhook (historical Backend Regression PASS)
- Payment failure (historical Backend Regression PASS)
- Payment refund (historical Backend Regression PASS)
- Buyer purchase (historical Backend Regression PASS)
- Seller application (historical Backend Regression PASS)
- Seller product/media (historical Backend Regression PASS)

These items are existing completed work. Reuse and verify them as needed; do not rebuild them from scratch unless a later regression demonstrates that rebuilding/fixing is actually required.

## Known regression state

Historical Backend Regression run `33258384757` reached the application tests. The unit-test stage reported 186/187 passing and failed on `completePayment uses order_id as the entitlement idempotency key` because the `entitlements` table did not contain `granted_at`. Subsequent E2E stages were skipped because the unit-test stage failed.

## Current code/schema inspection

The current `main` implementation has now been inspected directly. `backend/src/payments/complete-payment.js` inserts entitlements using the canonical columns `user_id`, `product_id`, and `order_id`, and returns `created_at`; it does not reference `granted_at`. The canonical `backend/migrations/003_orders_entitlements.sql` likewise defines `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` and has no `granted_at` column. Therefore the historical `granted_at` failure is stale relative to the current checked-in implementation/schema, and no speculative `granted_at` migration or application rewrite should be added.

The existing `backend/src/payments/complete-payment.test.js` also uses the current entitlement schema. Keep this implementation and test intact unless a fresh regression demonstrates a concrete failure.

## PR #8 status

PR #8 is an open/mergeable CI marker PR. Its changed files are `ci/entitlement-schema-fix.txt` and this progress ledger. It does not contain an application-code or migration fix for the historical `granted_at` mismatch. Do not merge it as a substitute for an actual required fix.

## Remaining work

1. Use the current checked-in implementation/schema as the source of truth; do not add `granted_at` solely because of the historical failure message.
2. Run a fresh Backend Regression against the current `main` and record the result.
3. If the fresh regression identifies a concrete failure, make only the minimum correction required for that failure.
4. If unit tests pass, verify the previously skipped payout/admin/media E2E stages.
5. Run final regression.
6. Review and merge only the PRs whose changes are actually required.
7. Merge to `main` only after the final regression is green.

## Current blocker

The current implementation/schema inspection is complete. The remaining blocker is execution: no fresh Backend Regression has yet been confirmed after the historical `granted_at` failure. The available GitHub connector does not currently expose a workflow-dispatch action, so do not manufacture dummy application changes merely to trigger CI.

## Continuation rule

On every new session, first read this file and inspect the current PR/CI state. Treat this ledger as the continuation point. Identify what already exists before writing new code. Reuse existing work and continue from the first genuinely unfinished or failing item. Do not recreate completed features simply because the previous work is not immediately visible in chat history. Completion requires green final CI and the required merge to `main`; do not estimate completion by an arbitrary number of turns.
