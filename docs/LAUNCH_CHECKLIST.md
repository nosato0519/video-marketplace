# Production launch checklist

## Application

- [ ] Production environment variables are configured outside Git.
- [ ] HTTPS is enabled and HTTP is redirected or otherwise controlled.
- [ ] Authentication and session settings are production-ready.
- [ ] Rate limiting and abuse controls are configured.
- [ ] Error responses do not expose secrets, stack traces, or internal storage keys.
- [ ] CORS and security headers are reviewed for the production domains.

## Database

- [ ] Production PostgreSQL database is backed up before migrations.
- [ ] Migrations are applied in order.
- [ ] Canonical `orders` and `entitlements` schema is present.
- [ ] Legacy purchase-flow tables have a documented retention/cleanup decision.
- [ ] Restore procedure has been tested.

## Payments

- [ ] Payment provider account is approved for the intended business model.
- [ ] Production webhook endpoint uses signature verification.
- [ ] Webhook idempotency has been tested.
- [ ] Successful payment creates exactly one order entitlement.
- [ ] Refund and chargeback handling is defined and tested.
- [ ] Supported countries, currencies and payment methods are explicitly configured.

## Media

- [ ] Production media storage is private.
- [ ] Application never exposes permanent public media URLs.
- [ ] Purchased-only streaming works.
- [ ] Purchased-only downloads work.
- [ ] Range requests work for large media.
- [ ] Revoked/refunded entitlements cannot access media.
- [ ] Upload validation, malware scanning and size limits are configured before accepting seller uploads.

## International sales

- [ ] English customer journey is complete.
- [ ] Japanese customer journey is complete.
- [ ] Currency is stored with ISO 4217 code.
- [ ] UTC timestamps are used internally.
- [ ] Product translation fallback is tested.
- [ ] Tax/VAT/GST responsibilities are reviewed for target markets.
- [ ] Privacy, terms, refund and cookie documents are published in the required languages.
- [ ] Customer support process is operational.

## Seller operations

- [ ] Seller onboarding is complete.
- [ ] Required identity/payment information is collected securely.
- [ ] Content ownership and rights declarations are collected.
- [ ] Moderation/approval workflow is operational.
- [ ] Seller sales and payout reporting is available.
- [ ] Takedown/reporting process is operational.

## Final go/no-go

Do not open production sales until every security, payment, media-access, legal/compliance, backup, and support item applicable to the deployment is verified and recorded by the operator.
