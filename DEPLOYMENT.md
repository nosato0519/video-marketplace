# Production Deployment Runbook

This document is the provider-neutral production deployment procedure for VIDORA. Choose the hosting provider/runtime separately; do not commit provider credentials or environment-specific secrets.

## 1. Runtime requirements

- Node.js 20 or newer.
- PostgreSQL reachable from the application runtime.
- HTTPS at the public edge/reverse proxy.
- Persistent private object storage for protected media. Use S3-compatible storage in production; the local media provider is for development only.
- A process manager/platform that restarts the application on failure and supports graceful termination.

The API starts with:

```bash
cd backend
npm ci
npm run migrate:preflight
npm run migration:plan
npm run migrate
npm start
```

Run migrations as a controlled release step against the intended production database. Do not run destructive restore operations as part of a normal deploy.

## 2. Required environment

Set production values for:

- `NODE_ENV=production`
- `PORT`
- `DATABASE_URL`
- strong, randomly generated `SESSION_SECRET`
- `MEDIA_STORAGE_PROVIDER=s3`
- S3 bucket/region/credentials or the configured S3-compatible endpoint
- `MEDIA_URL_SECRET`
- `MEDIA_MAX_UPLOAD_BYTES`
- `PAYMENT_PROVIDER=stripe`
- Stripe secret key, success/cancel URLs, and webhook secret

Keep secrets in the hosting provider's secret store/environment configuration. Never commit `.env`, production credentials, customer data, database dumps, or media archives.

## 3. Public edge / reverse proxy

Expose the application only through HTTPS. The public edge should:

1. Terminate TLS with a valid certificate.
2. Forward requests to the Node.js process on its private/internal port.
3. Preserve the `Host` header and standard forwarded-protocol information.
4. Enforce an appropriate request/body timeout and upload limit consistent with the configured media limit.
5. Avoid caching protected API responses or protected media at a public/shared cache unless an explicit authenticated media-delivery design is in place.

The application already uses security headers and generic error responses; do not bypass them at the proxy.

## 4. Health and release checks

Before opening public traffic:

```bash
curl -fsS https://YOUR_DOMAIN/api/health
curl -fsS https://YOUR_DOMAIN/api/ready
```

`/api/health` verifies the process is responding. `/api/ready` verifies database readiness.

Then run the smallest release acceptance set appropriate to the change. For a production launch, complete the full browser acceptance matrix recorded in `PROJECT_STATE.md`.

## 5. Media storage

Production protected videos must not depend on ephemeral application-disk storage. Configure the S3 provider, keep the bucket private, and preserve the application media-record/object mapping.

Before launch:

- upload a test media object;
- verify unauthorized access is rejected;
- verify an entitled buyer can watch and download;
- verify a non-entitled buyer cannot watch or download;
- verify deletion/replacement follows the media lifecycle;
- configure media backup/retention separately from PostgreSQL backups.

## 6. Stripe webhook

Configure the production Stripe webhook endpoint to the deployed HTTPS application and set the matching webhook secret in the runtime environment.

After configuration, perform a controlled test payment/webhook flow and confirm:

`checkout → verified webhook → paid order → entitlement → Library → protected watch/download`

Do not treat a browser-side success page as proof that payment was settled.

## 7. Database backup and recovery

Before the first production deploy, take a database backup. Follow `BACKUP.md` for backup/restore commands and restore safeguards.

At minimum, establish:

- scheduled encrypted database backups;
- media/object-storage backups or versioning;
- retention policy;
- restricted restore permissions;
- documented RPO/RTO;
- a successful restore drill before declaring the service launch-ready.

## 8. Zero-downtime / safe rollout order

For each release:

1. Confirm the target commit and release notes.
2. Back up production data when the change warrants it.
3. Deploy application code to the new runtime.
4. Apply compatible database migrations.
5. Verify `/api/health` and `/api/ready`.
6. Run release acceptance checks.
7. Open/restore public traffic only after acceptance succeeds.
8. Monitor errors, payment webhooks, media access, and database health.

If acceptance fails, stop the rollout and use the platform's rollback mechanism. Do not manually edit production database rows as a routine recovery method.

## 9. Launch acceptance checklist

The deployment is not considered production-ready until all of these are true:

- [ ] Public domain resolves over HTTPS.
- [ ] `/api/health` is healthy.
- [ ] `/api/ready` is healthy.
- [ ] Production PostgreSQL is provisioned and backed up.
- [ ] Restore drill has succeeded.
- [ ] Private media storage is configured and backed up.
- [ ] Session/payment/storage secrets are configured outside Git.
- [ ] Stripe live webhook is configured and verified.
- [ ] Buyer purchase → Library → watch/download succeeds.
- [ ] Unauthorized media access is rejected.
- [ ] Seller product/media workflow succeeds.
- [ ] Admin moderation/verification/payout workflow succeeds.
- [ ] Monitoring and incident contacts are configured.

The repository can be code-complete while the final launch remains blocked on these external infrastructure, account, credential, and acceptance steps.
