# Security Release Gate V1

## Purpose
Prevent the marketplace from being commercially packaged until critical security properties are verified.

## Mandatory gates
### Authentication & authorization
- [ ] Authentication failures are handled safely.
- [ ] Object-level authorization prevents cross-user access.
- [ ] Role boundaries are enforced server-side.
- [ ] Session/token invalidation works as designed.

### Commerce
- [ ] Client cannot alter trusted prices.
- [ ] Payment callbacks are authenticated.
- [ ] Duplicate events are idempotent.
- [ ] Refunds and disputes update access/ledger state correctly.

### Media
- [ ] Original protected media is not publicly accessible.
- [ ] Entitlement is checked server-side.
- [ ] Expired/revoked access is rejected.
- [ ] Direct URL/ID manipulation cannot bypass authorization.

### Uploads
- [ ] Upload authorization is enforced server-side.
- [ ] File validation and processing are isolated appropriately.
- [ ] Dangerous metadata/path handling is rejected.
- [ ] Private uploads cannot become public through frontend manipulation.

### Secrets & data
- [ ] No secrets are committed to source control.
- [ ] Sensitive logs are redacted.
- [ ] Production secrets are configured outside the frontend bundle.
- [ ] Backup/restore procedures are documented.

### Abuse & operations
- [ ] Rate limits exist for high-risk endpoints.
- [ ] Critical admin actions are audited.
- [ ] Report/takedown controls are authorized.
- [ ] Security-relevant failures have safe user messages and reference IDs.

## Evidence
Each checked gate should point to a test, configuration check, or documented operational procedure. A release is not marked security-verified based solely on manual inspection.

## Commercial wording
Only verified controls may appear as security claims on the sales page. Never claim absolute security or guaranteed prevention of piracy.
