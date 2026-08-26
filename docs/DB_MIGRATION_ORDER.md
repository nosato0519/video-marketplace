# Database migration order

## Purpose

This document defines the canonical migration order for production deployments. The repository contains historical migrations from earlier iterations; they must not be treated as interchangeable schemas.

## Canonical rule

The application currently uses the UUID-based commerce model (`orders` + `entitlements`) and the UUID-based product/media model. Legacy BIGSERIAL purchase-flow definitions must not be used by new application code.

## Before production

1. Inventory every migration in `backend/migrations/`.
2. Determine which migrations have already been applied to the target database.
3. Take a verified database backup.
4. Apply only migrations required by the canonical schema and the deployment state.
5. Run the application's database and integration tests.
6. Verify that payment, entitlement, streaming and download queries use the canonical tables.
7. Do not drop legacy tables until historical data retention, migration, rollback and backup requirements have been reviewed.

## Important

There are multiple historical migration files with reused numeric prefixes. A filename alone must therefore not be used as evidence that a migration is safe to apply to an existing production database. Production deployments must use an explicit migration ledger or reviewed migration runner that records the exact migration identity (filename plus checksum).

## Rollback

Database rollbacks must be handled as reviewed forward migrations whenever possible. Do not automatically reverse a production migration that may have modified or deleted customer orders, payment records, entitlements, seller balances, or media metadata.
