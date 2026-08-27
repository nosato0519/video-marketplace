# Video Marketplace — Buyer / Seller Handoff & Installation Guide

This document is part of the deliverable. The goal is that a buyer of this software can understand what they received, what accounts/services they need, how to install it, how to configure languages/currencies, how to operate the marketplace, and what must be checked before accepting real payments.

## 1. What is being sold

The product is the software and its deployment/configuration documentation for a multi-seller video marketplace. The software is designed to support:

- Buyer catalog, product detail, checkout and account/library flows.
- Seller onboarding, product/video management and sales operations.
- Admin moderation and marketplace operations.
- Payment-provider integration.
- Private media storage and entitlement-gated streaming/download.
- Multilingual buyer/seller/admin UI architecture.
- Configurable currency/payment and deployment boundaries.

The software does **not** automatically transfer third-party accounts, payment-provider accounts, domains, hosting accounts, storage accounts, email accounts, trademarks, copyrighted videos, seller agreements, or legal registrations unless a separate sales agreement explicitly says so.

## 2. What the purchaser needs before installation

### Required accounts/services

The exact providers can vary, but a production deployment normally needs:

- Domain name and DNS access.
- HTTPS/TLS certificate or a platform that provisions it.
- Production application hosting.
- Production PostgreSQL database.
- Private object/media storage suitable for the expected video volume.
- CDN/media delivery service when required by traffic and architecture.
- Payment provider account supported in the launch country and approved for the intended content/business model.
- Webhook endpoint and DNS/hosting access.
- Transactional email provider if email verification, password reset or notifications are enabled.
- Error monitoring/logging service recommended for production.
- Backup storage/service.
- Seller payout provider/account if the marketplace pays independent sellers.

The purchaser is responsible for opening and verifying these accounts unless the purchase agreement states otherwise.

## 3. Information/configuration required from the purchaser

Before launch, collect:

- Legal business/operator name.
- Operating country and launch countries.
- Business address and contact information required by providers/law.
- Support email address.
- Privacy/contact email addresses.
- Domain name.
- Brand name/logo and approved visual assets.
- Default language.
- Enabled languages.
- Default currency.
- Enabled currencies/payment methods.
- Marketplace commission/fee rules.
- Seller payout rules and schedule.
- Refund/cancellation rules.
- Content moderation rules.
- Seller terms and buyer terms.
- Privacy policy and cookie policy where required.
- Age/region restrictions where legally required.
- Tax/VAT/GST configuration as applicable.
- Storage/CDN limits and expected monthly traffic.

## 4. Installation overview

The purchaser should follow this order rather than changing random files:

1. Obtain the repository/release package.
2. Confirm the supported Node/runtime versions from the release documentation.
3. Install backend dependencies.
4. Provision PostgreSQL.
5. Configure application environment variables using the provided example/template; never commit real secrets.
6. Configure media storage.
7. Configure the payment provider and webhook endpoint.
8. Configure domain/DNS and HTTPS.
9. Run database migrations/seeding as documented for the release.
10. Run automated tests.
11. Run the clean-install acceptance checklist.
12. Create the first admin account using the documented secure process.
13. Configure languages/currencies and legal pages.
14. Configure seller/payout settings.
15. Upload a test video as a seller.
16. Publish a test product.
17. Complete a test purchase using the provider's test/sandbox environment.
18. Confirm webhook settlement, entitlement creation, Library appearance, protected Watch and protected Download.
19. Confirm seller sale/fee/payout records.
20. Only after acceptance tests pass, switch to production payment credentials and production media/storage.

## 5. Environment variables and secrets

A release should include an `.env.example` or equivalent documentation describing every required variable without containing real secrets.

Typical categories include:

- Database connection.
- Application/session/auth secrets.
- Payment provider keys and webhook secret.
- Media storage credentials/configuration.
- Media signing/secret configuration where applicable.
- Email provider credentials.
- Public site URL and API URL.
- Runtime environment.
- Logging/monitoring configuration.

Never place production credentials, private media, database dumps containing personal data, or payment secrets in Git.

## 6. Language setup

The software uses a shared localization architecture so languages are not hard-coded separately into every page.

### Recommended initial setup

- English: enabled by default for international operation.
- Japanese: enabled for Japanese operators/buyers.
- Additional locales: enable only after the UI strings have been reviewed.

### Adding a language

1. Add the locale code to the shared supported-locale configuration.
2. Add the locale's UI message catalog.
3. Review every buyer page: home, catalog, product, checkout, success, library, player, account and orders.
4. Review seller pages and admin pages.
5. Check validation/error/payment messages, not just visible headings.
6. Check date, number and currency formatting.
7. Test language persistence after login/logout and navigation.
8. Test mobile layouts with longer translated strings.
9. Have production translations reviewed by a fluent human before launch.

The marketplace does not require translating the underlying videos merely because a new UI language is enabled.

## 7. Currency setup

Currency support must be configured together with the chosen payment provider. Do not assume that enabling a currency in the UI means the provider can settle it in every seller/operator country.

For each currency:

- Confirm payment-provider support.
- Confirm seller payout support.
- Define price formatting and decimal rules.
- Define whether products have one base price or per-currency prices.
- Test checkout and webhook amounts using the exact currency.
- Test refunds/chargebacks if supported.
- Confirm tax handling.

## 8. Buyer operating guide

### Browse and purchase
1. Open the marketplace.
2. Choose a language.
3. Search/filter the Catalog.
4. Open a product.
5. Review seller, price, description and purchase terms.
6. Start Checkout.
7. Complete payment.
8. Confirm the success page.
9. Open My Library.
10. Select the purchased product.
11. Watch through the protected player.
12. Use Download only when the product and operator permit downloads.

### Important security rule
A buyer must never be given an unrestricted public media URL. Access is granted through authenticated entitlement checks and the protected media delivery mechanism.

## 9. Seller operating guide

### Seller onboarding
1. Create an account.
2. Complete required identity/business verification.
3. Configure payout information.
4. Read and accept seller terms.
5. Open the seller dashboard.

### Product publishing
1. Create a product.
2. Upload the video through the supported uploader.
3. Add thumbnail and metadata.
4. Select category.
5. Set price/currency.
6. Set viewing/download policy.
7. Submit for moderation if moderation is enabled.
8. Publish after approval.
9. Confirm the product is visible in Catalog.

### Sales
Seller dashboard should provide:

- Orders.
- Gross sales.
- Marketplace fees.
- Net seller earnings.
- Payout status.
- Refund/chargeback status where applicable.

## 10. Admin operating guide

Routine admin operation should be possible through the UI without direct database editing.

Admin tasks include:

- Seller approval/suspension.
- Product approval/rejection.
- Content removal/takedown.
- Buyer/seller account restrictions.
- Order/payment inspection.
- Reports and moderation.
- Fee configuration.
- Payout status review.
- Audit/log review.
- Operational health checks.

## 11. Production launch checklist

Before accepting real money:

- [ ] Domain and HTTPS verified.
- [ ] Production database backed up.
- [ ] Restore procedure tested.
- [ ] Production storage configured as private.
- [ ] CDN/delivery rules tested.
- [ ] Payment account approved for the actual business/content.
- [ ] Webhook signature verified.
- [ ] Webhook idempotency tested.
- [ ] Buyer entitlement tested.
- [ ] Unauthorized media access tested and rejected.
- [ ] Download authorization tested.
- [ ] Seller ownership authorization tested.
- [ ] Admin authorization tested.
- [ ] Rate limiting/security controls tested.
- [ ] Email flows tested.
- [ ] Password reset tested.
- [ ] All enabled languages reviewed.
- [ ] All enabled currencies/payment methods tested.
- [ ] Legal pages published.
- [ ] Refund/cancellation rules published.
- [ ] Privacy/cookie/consumer disclosures reviewed.
- [ ] Seller terms published.
- [ ] Payout rules published.
- [ ] Tax/accounting workflow confirmed.
- [ ] Monitoring and error alerts configured.
- [ ] Incident/contact procedure documented.
- [ ] Test purchase completed end-to-end.

## 12. Legal and provider approval

The software does not itself make a business legal in a particular country. Before launch, the purchaser must obtain appropriate professional/legal advice for the actual operating country and target markets.

In particular, verify:

- Marketplace/business registration requirements.
- Consumer protection and distance-selling rules.
- Privacy/data-protection requirements.
- Cookie/tracking requirements.
- Tax/VAT/GST obligations.
- Seller agreements and payout obligations.
- Copyright/licensing/takedown procedures.
- Age/region restrictions where applicable.
- Payment-provider acceptable-use rules.
- Hosting/storage/CDN acceptable-use rules.
- Any special rules triggered by the content category.

## 13. Delivery package requirements

A sale-ready software package should include:

- Source code/release package.
- `README.md`.
- `PROJECT_STATE.md`.
- `PRODUCT_VISION.md`.
- `DEV_LOG.md`.
- This handoff/installation guide.
- Environment variable template.
- Database migration instructions.
- Deployment instructions.
- Payment-provider setup instructions.
- Storage/CDN setup instructions.
- Language/currency setup instructions.
- Admin manual.
- Seller manual.
- Buyer flow/acceptance test.
- Backup/restore instructions.
- Upgrade/rollback instructions.
- Security checklist.
- Known limitations and unsupported configurations.
- License/transfer terms appropriate to the actual sale agreement.

## 14. What is not promised automatically

Unless explicitly included in the sale agreement, the software purchase does not automatically include:

- Domain ownership.
- Hosting fees.
- Database fees.
- Storage/CDN fees.
- Payment-provider approval.
- Payment-provider account ownership.
- Seller payout-provider account.
- Email provider account.
- Legal registration.
- Legal advice.
- Tax advice.
- Content licenses.
- Seller contracts.
- Existing customer accounts/data.
- Existing videos.
- Ongoing maintenance or future feature development.

## 15. Acceptance standard

A purchaser should not be told that the software is ready merely because it installs successfully. Acceptance requires the documented end-to-end tests to pass in a clean environment, including buyer purchase, payment verification, entitlement, protected media access, seller sale accounting and administrative moderation. Production credentials should only be enabled after sandbox/test acceptance and the purchaser's legal/provider checks are complete.
