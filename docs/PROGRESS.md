# Project Progress Ledger

Last updated: 2026-08-30

## Rule: do not redo completed work

Items marked PASS are considered completed and must not be reimplemented or recreated unless a later regression proves they are broken.

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

## Known regression state

Historical Backend Regression run `33258384757` reached the application tests. The unit-test stage reported 186/187 passing and failed on `completePayment uses order_id as the entitlement idempotency key` because the `entitlements` table did not contain `granted_at`. Subsequent E2E stages were skipped because the unit-test stage failed.

## PR #8 status

PR #8 is an open/mergeable CI marker PR. Its changed files are `ci/entitlement-schema-fix.txt` and this progress ledger. It does not contain an application-code or migration fix for the `granted_at` mismatch. Do not merge it as a substitute for the actual fix.

## Remaining work

1. Inspect the actual `completePayment` implementation and canonical `entitlements` migration/schema.
2. Make the minimum code/schema correction for the `granted_at` mismatch.
3. Run a fresh Backend Regression and record the result.
4. If unit tests pass, verify the previously skipped payout/admin/media E2E stages.
5. Run final regression.
6. Review and merge only the PRs whose changes are actually required.
7. Merge to `main` only after the final regression is green.

## Current blocker

The available GitHub connector has not yet exposed the implementation files needed to safely edit `completePayment`/the relevant migration, and no fresh Backend Regression has been confirmed after the mismatch was identified.

## Continuation rule

On the next session, start by reading this file and the current PR/CI state. Do not recreate any item in the PASS list. Continue from the `granted_at` schema mismatch investigation, then run fresh CI. Do not claim completion based on a target number of turns; completion requires green CI and merge to `main`.
