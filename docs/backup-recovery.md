# Backup & Recovery Runbook

This runbook treats marketplace state as two coupled assets: PostgreSQL data and protected media storage.

## What must be backed up

1. PostgreSQL database, including orders, payments, entitlements, users, products, media metadata, and migration state.
2. Production media/object storage containing the video files referenced by media records.
3. Deployment configuration and migration files from the exact application release.

Never store production secrets inside the backup repository or source tree.

## Database backup

Use PostgreSQL's supported dump tooling from a trusted operator environment. Example:

```bash
pg_dump --format=custom --file=marketplace-$(date +%Y%m%d-%H%M%S).dump "$DATABASE_URL"
```

Store backups outside the application host and encrypt them at rest. Restrict restore access to trusted operators.

## Media backup

Use the storage provider's versioning/replication/backup capability where available. Keep the media object identifiers and metadata from PostgreSQL aligned with the storage backup snapshot.

Do not expose backup buckets through the public web server.

## Recovery order

1. Deploy the exact application release whose schema/migrations match the backup.
2. Restore PostgreSQL into an isolated recovery database.
3. Run the migration preflight; do not blindly run newer migrations against an older backup.
4. Restore the corresponding media snapshot.
5. Verify that every saleable media record references an existing media object.
6. Verify order/payment/entitlement relationships.
7. Start the application against the recovered database/storage only after integrity checks pass.
8. Run the core HTTP acceptance tests before returning traffic.

## Integrity checks

At minimum verify:

- no paid order references a missing product;
- no active entitlement references a missing product;
- saleable media has a valid storage key;
- protected media cannot be fetched without entitlement;
- paid buyers can still access their purchased media;
- seller earnings remain consistent with paid orders;
- payment webhook idempotency records remain present.

## Restore test

A backup is not considered production-ready until a restore has been exercised in an isolated environment. Record:

- backup timestamp;
- application commit/release;
- database dump checksum;
- media snapshot/version;
- restore duration;
- integrity-test result;
- operator and date.

## Rollback principle

If a deployment fails after a schema or data migration, stop traffic-changing operations and follow the release-specific rollback plan. Do not manually delete migration records or alter payment/entitlement rows to make tests pass.

## Recovery objective

Set the final RPO/RTO according to the production storage and database providers. The application repository alone is not a backup of customer media or transactional data.
