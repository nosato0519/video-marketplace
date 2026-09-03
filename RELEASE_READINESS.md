# Video Marketplace — Release Readiness

This checklist is the final release gate. It records verified automated coverage and the remaining production-environment checks without weakening the existing acceptance suites.

## 1. Runtime matrix

| Area | Supported / verified |
| --- | --- |
| Node.js | `>=20` (package engine requirement) |
| CI regression runtime | Node.js 22 |
| PostgreSQL acceptance runtime | PostgreSQL 16 |
| Browser acceptance | Existing same-origin browser proxy + Playwright |

The project declares Node.js `>=20`; the canonical backend regression runs on Node.js 22 and PostgreSQL 16. Do not lower the runtime requirement or introduce a second browser server for release validation.

## 2. Automated gates already GREEN

- Backend Regression: run `33710004552` — GREEN.
- Browser UI Acceptance: run `33710004553` — GREEN.
- Backend regression includes migrations, backup/restore round-trip, unit/regression tests, authentication, payment webhook/failure/refund, Buyer purchase, Seller application/product/media/earnings/payout, payout concurrency, media authorization/upload/access, and security regression suites.
- Browser acceptance includes Buyer browser acceptance and browser module smoke.

## 3. Production configuration gate

Before enabling real checkout, verify all of the following in the deployment environment:

- `DATABASE_URL` points to the production PostgreSQL database.
- `SESSION_SECRET` is a strong production-only secret.
- `MEDIA_STORAGE_PROVIDER` and production media storage are configured.
- `MEDIA_URL_SECRET` is a strong production-only secret.
- `PAYMENT_PROVIDER=stripe` for the currently implemented live checkout adapter.
- `STRIPE_SECRET_KEY`, `STRIPE_SUCCESS_URL`, and `STRIPE_CANCEL_URL` are present.
- `PAYMENT_WEBHOOK_SECRET` matches the deployed Stripe webhook endpoint.
- No production credential is committed to Git or copied into application/database records.

## 4. Payment scope gate

Stripe is the currently implemented live checkout adapter. PayPal, Adyen, Paddle and PayPay remain catalog entries marked `adapter_ready` and are intentionally unavailable at runtime until their adapters and webhook contracts are implemented and independently accepted. They must not be presented as working checkout methods in a production release.

Payment completion must continue to depend on a verified provider webhook, not a browser success redirect.

## 5. Backup / recovery gate

Before release:

1. Take a production database backup.
2. Verify the backup is readable and stored outside the primary database host.
3. Verify media backup/retention for protected media.
4. Perform a restore drill in an isolated environment.
5. Run migration preflight before any upgrade.
6. After upgrade, run health checks and the established acceptance gates.
7. Keep a rollback point until the release is accepted.

## 6. Security gate

Confirm in the actual deployment:

- HTTPS is enforced.
- Production secrets are supplied by the deployment secret manager/environment, not source control.
- Protected media remains inaccessible without an active entitlement.
- Upload validation remains enabled.
- Session/authentication protections and rate limits remain enabled.
- Error responses do not expose internal implementation details.
- Database backups and logs do not contain application secrets.
- Storage paths cannot escape the configured media root.

## 7. Refund / payout policy boundary

A refund revokes the buyer entitlement and marks the related seller earning as refunded. Paid payout history remains preserved. The current schema has no payout-reversal/recovery-liability field, so the release does not invent an automatic recovery mechanism for funds already paid out. Any such recovery process requires an explicit business/accounting decision and a separate schema design.

## 8. Final browser gate

The automated browser gate is already GREEN. Before commercial launch, perform one real deployment-browser pass covering:

- Buyer: registration/login → catalog → product detail → checkout handoff → Library → watch → authorized download.
- Seller: registration/application → product/media management → publishing → earnings → payout status.
- Admin: seller review → moderation → payout review/status.
- Unauthorized buyer/media access is rejected.
- Responsive layout is usable on desktop and mobile widths.

Do not replace the existing browser acceptance infrastructure with a parallel frontend server.

## Release decision

The repository is at the final hardening stage. Automated acceptance is GREEN; production release remains conditional on the deployment-specific configuration, backup/restore, security and real-browser checks above.
