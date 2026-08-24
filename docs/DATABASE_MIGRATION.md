# Database setup v0.1

## Target
PostgreSQL is the initial relational database target for the marketplace.

## Development sequence
1. Create a dedicated development database.
2. Apply `backend/db/schema.sql`.
3. Apply `backend/db/seed.sql` only in development/test environments.
4. Point `DATABASE_URL` at the development database.
5. Run API integration tests against the database.
6. Never run development seed data against production.

## Production requirements
- Use managed PostgreSQL or an equivalently maintained production deployment.
- Keep credentials in the deployment secret manager, never in Git.
- Backups must be automated and periodically restored in a test environment.
- Schema changes must use versioned migrations before production launch.
- Database access should use a dedicated application role with least privilege.
- Production data must not be copied into local development without an approved privacy/security process.

## Current limitation
`schema.sql` is the first catalog-oriented schema and is not yet the complete production schema. Orders, payments, payouts, media assets, moderation, reports, region rules and audit events will be added in subsequent migrations.
