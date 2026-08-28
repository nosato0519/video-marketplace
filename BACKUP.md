# Backup and Restore

This project uses PostgreSQL for application state. Backups are operational data and must never be committed to Git.

## Database backup

From `backend/`:

```bash
npm run backup:db -- ../backups/marketplace-YYYYMMDD-HHMM.dump
```

The script uses `pg_dump` custom format and refuses to leave an empty backup file behind.

## Database restore

Restore is intentionally destructive and requires an explicit environment flag:

```bash
ALLOW_DB_RESTORE=true npm run restore:db -- ../backups/marketplace-YYYYMMDD-HHMM.dump
```

Before restoring production data:

1. Stop or drain application traffic.
2. Verify the backup file and its source environment.
3. Take a fresh backup of the current database.
4. Restore into the intended database.
5. Run `npm run migrate:preflight` and `npm run migration:plan`.
6. Run the core acceptance suite before reopening traffic.

## Media storage

Database backups do not contain protected video/object-storage files when media is stored outside PostgreSQL. Production operations must back up the configured media storage separately and preserve the mapping between media records and stored objects.

For the default local provider, back up `MEDIA_STORAGE_DIR` using the host's filesystem backup system. Do not place media archives in the Git repository.

## Security

- Keep backup files outside the repository.
- Encrypt backups at rest and in transit.
- Restrict restore permissions to trusted operators.
- Use separate production backup credentials where supported.
- Never put `DATABASE_URL`, storage credentials, or payment secrets in backup scripts, logs, or Git.
