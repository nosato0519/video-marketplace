# Backup, Update & Recovery V1

## Goal
Make routine maintenance understandable to non-programmer operators while protecting data integrity.

## Backup policy
Back up separately:
- database;
- private media metadata;
- configuration/secrets according to deployment policy;
- application-specific persistent files.

Private media originals should use storage-provider backup/versioning where appropriate rather than being copied into the public web root.

## Backup verification
A backup is not considered valid merely because a job says "success". The release/operations procedure should periodically perform a restore test in an isolated environment.

## Update flow
1. Check compatibility.
2. Create verified backup.
3. Put application into maintenance mode when required.
4. Apply release package.
5. Run database migrations.
6. Run health checks.
7. Run smoke tests.
8. Exit maintenance mode.
9. Record release/version result.

## Failed update
If migration or health checks fail:
- keep the application safely unavailable rather than serving a partially migrated state;
- preserve logs/reference IDs;
- follow the documented recovery procedure;
- restore database/application version only when the documented rollback path supports it.

## Compatibility
Each release must document:
- supported runtime versions;
- database requirements;
- storage requirements;
- provider/API compatibility;
- breaking configuration changes;
- migration notes.

## Security
- Backup files must not be publicly accessible.
- Secrets must not be included in example backups.
- Update packages must be distributed through a trusted channel and integrity-checked where supported.
- Operators must not be instructed to disable security controls as a normal update step.

## Acceptance tests
- Clean backup can be restored in an isolated environment.
- Upgrade from the previous supported release succeeds.
- Migration is repeatable/idempotent where designed.
- Failed migration leaves a documented recovery path.
- Health checks detect missing dependencies/configuration after update.
