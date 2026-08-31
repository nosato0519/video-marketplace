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

## PR #8 status

PR #8 is an open/mergeable CI marker PR. Its changed files are `ci/entitlement-schema-fix.txt` and this progress ledger. It does not contain an application-code or migration fix for the `granted_at` mismatch. Do not merge it as a substitute for the actual fix.

## Remaining work

1. Inspect the actual `completePayment` implementation and canonical `entitlements` migration/schema.
2. Reuse the existing implementation and make only the minimum correction required for the `granted_at` mismatch.
3. Run a fresh Backend Regression and record the result.
4. If unit tests pass, verify the previously skipped payout/admin/media E2E stages.
5. Run final regression.
6. Review and merge only the PRs whose changes are actually required.
7. Merge to `main` only after the final regression is green.

## Current blocker

The available GitHub connector has not yet exposed the implementation files needed to safely edit `completePayment`/the relevant migration, and no fresh Backend Regression has been confirmed after the mismatch was identified.

## Continuation rule

On every new session, first read this file and inspect the current PR/CI state. Treat this ledger as the continuation point. Identify what already exists before writing new code. Reuse existing work and continue from the first genuinely unfinished or failing item. Do not recreate completed features simply because the previous work is not immediately visible in chat history. Completion requires green final CI and the required merge to `main`; do not estimate completion by an arbitrary number of turns.
