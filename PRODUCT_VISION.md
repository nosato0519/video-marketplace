# Video Marketplace — Product Vision & Completion Blueprint

## 1. Product concept

A centrally operated, reusable video marketplace for independent sellers and buyers. The platform is independently designed and implemented, inspired by the usability of Japanese video marketplaces but not a copy of any specific service.

The primary goal is to make buying, selling, watching and downloading videos clear, trustworthy and easy to operate. It should support buyers from multiple countries without turning the service into a translation-heavy international content platform. The product UI should be multilingual and multicurrency-capable; the videos themselves do not need to be translated merely because the buyer is overseas.

Adult content may be supported only where legally permitted and where the payment provider, hosting/storage provider and launch jurisdiction allow it. The architecture must remain general-purpose rather than being hard-coded for adult content.

## 2. Finished-site picture

### Buyer experience
1. Landing/home page explains the marketplace clearly.
2. Catalog lets buyers search, filter and browse videos.
3. Product detail page shows title, description, creator/seller, price, preview/thumbnail and purchase information.
4. Buyer checks out through the configured payment provider.
5. Successful payment creates/settles the order and grants the buyer an entitlement.
6. Purchased videos appear in My Library.
7. The buyer can watch purchased videos through protected media delivery.
8. If the product/operator permits downloading, the buyer can download the purchased video through an authorized protected route.
9. Account/order history gives the buyer a clear record of purchases.
10. Language selection and responsive design make the buyer UI usable on desktop and mobile.

### Seller experience
1. Seller creates and verifies an account.
2. Seller opens a dashboard with no-code routine operation.
3. Seller uploads a video and thumbnail/metadata.
4. Seller sets title, description, category, price, currency and sales/download policy.
5. Seller submits or publishes the product according to moderation rules.
6. Seller can see product status, orders, sales and earnings.
7. Seller can see fees and payout status.
8. Seller can request/receive payouts through the configured payout process.

### Admin experience
1. Admin dashboard works on desktop and smartphone.
2. Admin can manage buyers, sellers, products, orders and payments.
3. Admin can review/approve/reject seller content.
4. Admin can handle reports, takedowns and removal requests.
5. Admin can restrict accounts/products/regions where required.
6. Admin can inspect audit information and operational events.
7. Routine operations must not require SQL, shell commands or editing configuration files.

## 3. Core business model

- Centrally operated marketplace with multiple independent sellers.
- One-time video sales are the primary model.
- Bundles/sets, free products, discounts and promotional pricing can be supported.
- Monthly membership/subscription is not part of the current product scope.
- Marketplace revenue can come from a configurable platform fee/commission.
- Seller payout lifecycle must be explicit and auditable.
- Payment providers must be replaceable/configurable; raw card details must never be stored by this application.

## 4. Media architecture

Video assets remain in private storage. Public catalog/product pages must never expose an unrestricted private media URL.

Required flow:

Seller upload -> private storage -> product/media record -> moderation/publication -> buyer purchase -> entitlement -> authorized stream/download -> audit/revocation where applicable.

Protected media already has authenticated entitlement-gated streaming and download foundations, HTTP range support and secure local development storage. Production object storage/CDN and the final signed-delivery lifecycle still need completion.

## 5. Security goals

- Authentication and authorization at every protected operation.
- Buyer entitlement required before purchased media access.
- Seller ownership checks before seller operations.
- Admin authorization for moderation and operational controls.
- No raw payment-card storage.
- Private media storage.
- Path traversal protection.
- Input validation and safe database access.
- Webhook signature verification and idempotent settlement.
- Rate limiting/brute-force controls where appropriate.
- CSRF/XSS/security-header protections as applicable to the final architecture.
- Secure secrets management.
- Auditability and revocation for sensitive operations.
- Backup/restore and incident-recovery procedures before production launch.

## 6. Multilingual / international scope

The marketplace should be usable by buyers from multiple countries, but it is not intended to become a separate localized video-content service for every country.

Current architectural target:
- English and Japanese first.
- Additional UI locales can be added without changing product/order/media schemas.
- Browser language detection and user-selected language persistence.
- Multicurrency-capable product/payment architecture.
- Human review of production translations before launch.
- Legal, tax, consumer-protection, privacy and payment-provider requirements must be checked for actual launch countries.

## 7. Current technical state

The authoritative detailed project state is `PROJECT_STATE.md`.

Current major foundations include:
- Node/Express/PostgreSQL backend foundation.
- Catalog/product/order/checkout boundaries.
- Stripe payment webhook and settlement boundary.
- Idempotent entitlement grant.
- Protected media streaming.
- Authenticated buyer download route with range support.
- Secure local media storage adapter.
- Storage provider boundary.
- Startup validation for protected-media security configuration.
- Repository safeguards for secrets/private media.
- Regression tests for payment/media/security behavior.
- Responsive storefront and buyer/seller/admin UI foundations.
- Shared localization foundation and Catalog localization work.

## 8. Remaining completion phases

### Phase A — Buyer commerce completion
- Complete authenticated Library purchase-state integration.
- Complete Watch/Download UI integration.
- Complete product detail/checkout database-backed production UI wiring.
- Complete account/order history.

### Phase B — Seller completion
- Seller authentication/verification.
- Upload workflow.
- Product management.
- Moderation/publication workflow.
- Sales/earnings dashboard.
- Fees and payout lifecycle.

### Phase C — Admin completion
- Authenticated admin operations.
- Moderation/approval.
- Reports/takedowns.
- Account/product controls.
- Audit and operational tools.

### Phase D — Production media infrastructure
- Production object storage.
- Video processing/transcoding pipeline.
- CDN/delivery strategy.
- Signed delivery token lifecycle/revocation/audit if selected.
- Backup and restore.

### Phase E — Production readiness
- Persistent authentication/session architecture.
- Production PostgreSQL provisioning.
- Production payment/database E2E testing.
- Mobile/responsive polish.
- Full UI localization and translation review.
- Security review and abuse testing.
- Japan-specific and launch-jurisdiction legal/tax/privacy review.
- Clean install, upgrade, rollback and acceptance testing.

## 9. What 'finished' means

The project is not finished merely because pages exist or a local demo works.

The minimum finished definition is an end-to-end tested path:

Seller registers -> seller uploads -> product is approved/published -> buyer finds product -> buyer purchases -> payment is verified -> entitlement is granted -> product appears in Library -> authorized buyer can watch -> authorized buyer can download when permitted -> seller sale is recorded -> platform fee is calculated -> payout is recorded -> admin can operate/moderate the system -> security and production acceptance tests pass.

## 10. Continuation rule

At the start of every development session, read `PROJECT_STATE.md` and this file, inspect the latest commits and relevant repository code, and continue from the saved state. Do not rely on chat memory for the project's source of truth. Update `PROJECT_STATE.md` and `DEV_LOG.md` after meaningful milestones.
