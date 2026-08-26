# Video Marketplace — Installation & Deployment Manual

## 1. What this package is

A reusable, multi-seller video marketplace foundation. Buyers can discover products, purchase eligible content, receive purchase entitlements, stream purchased media and download purchased media. Sellers and administrators have dedicated workflow foundations.

Production launch is conditional on the laws, payment-provider rules, storage/CDN rules and content policies applicable to the operator's actual business, countries and content categories.

## 2. What must exist before installation

### Infrastructure
- Production server/hosting environment capable of running Node.js 20+
- PostgreSQL database
- Domain and HTTPS/TLS
- Private media storage with sufficient capacity
- Production object storage/CDN adapter once selected and validated
- Automated database and media backup
- Monitoring, alerting and error logging

### Business services
- Transactional email provider
- Hosted payment provider approved for the intended business/content
- Seller payout provider approved for the intended business/content
- Identity/verification provider if required by the launch model
- DNS/domain account

### Business/legal preparation
- Terms of service
- Privacy policy
- Refund/cancellation policy
- Seller agreement
- Copyright/takedown/reporting process
- Prohibited-content and moderation rules
- Seller payout/fee rules
- Age/region controls where legally required
- Applicable tax, invoicing and consumer-protection review

## 3. Security rules before installation

- Never commit production secrets.
- Never put private media inside the public web root.
- Never make a production media bucket public merely to simplify playback.
- Use unique production secrets.
- Use HTTPS for all authenticated and payment traffic.
- Do not store raw card details in this application.
- Do not use development seed/demo credentials in production.

The repository already excludes environment secrets, local private media, dependencies, logs and editor files through `.gitignore`. fileciteturn10file0L2-L2

## 4. Runtime installation

From `backend/`:

```bash
npm install
npm test
```

Node.js 20 or newer is required. The backend uses Node's built-in test runner. fileciteturn26file0L2-L2

Do not treat a successful process start as a production acceptance test. The full staging workflow must pass first.

## 5. Environment configuration

Start from `backend/.env.example` and set production values in the hosting environment rather than committing a real `.env` file.

Protected media currently requires:

- `MEDIA_URL_SECRET` — at least 32 characters and generated randomly
- `MEDIA_STORAGE_DIR` — private storage directory for the current local adapter
- `MEDIA_STORAGE_PROVIDER=local` — current supported provider

The application intentionally refuses to start when required protected-media configuration is missing or invalid. fileciteturn20file0L2-L2

## 6. Database installation

1. Create a dedicated PostgreSQL database and application user.
2. Apply the base schema.
3. Apply migrations in their documented order.
4. Verify foreign keys, constraints and indexes.
5. Seed only development/staging data where appropriate.
6. Create automated encrypted backups.
7. Perform a restoration test before launch.

Commerce data includes orders, order items, payments, payment events and seller settlements. fileciteturn16file0L2-L2

## 7. Initial site configuration

Configure through the supported administrative setup flow:

- Site name and branding
- Default language and enabled languages
- Default and supported currencies
- Country/region availability
- Time-zone defaults
- Buyer registration/login policy
- Seller registration and verification policy
- Content categories
- Moderation policy
- Download policy
- Platform fee/revenue share
- Refund policy
- Email sender
- Payment methods
- Seller payout rules
- Legal/policy pages

## 8. Buyer acceptance test

A staging buyer account must be able to complete:

1. Registration/login.
2. Browse and search.
3. Open a product detail page.
4. Create an order.
5. Enter hosted payment checkout.
6. Return after payment.
7. Have the paid order settled exactly once.
8. Receive the purchase entitlement.
9. See the purchase in the buyer library/order history.
10. Stream the purchased video.
11. Download the purchased video.
12. Resume a supported download with a byte range.
13. Be denied access after entitlement revocation/refund when policy requires revocation.

The protected stream checks authentication and purchase entitlement before reaching private storage. fileciteturn13file0L2-L2

## 9. Seller acceptance test

A staging seller must be able to:

1. Register as a seller.
2. Complete required verification.
3. Create a video product.
4. Upload media to private storage.
5. Submit for moderation.
6. See approval/rejection status.
7. Publish only after approval.
8. View sales and settlement status.
9. Follow the payout process.

## 10. Administrator acceptance test

An administrator must be able to operate the service without SQL, shell commands or source-code edits for routine tasks:

- Buyer accounts
- Seller accounts and verification
- Products
- Categories
- Moderation queue
- Reports/takedowns
- Orders/payments/refunds
- Seller settlements/payout status
- Download policy
- Region restrictions
- Site settings
- Legal pages
- Audit history

## 11. Media acceptance and security checks

Verify all of the following in staging:

- Unauthenticated access is rejected.
- Non-buyers cannot retrieve protected media.
- Revoked/refunded users cannot access media when entitlement is revoked.
- Storage is not publicly readable.
- Path traversal cannot escape the private storage directory.
- Streaming works with full and byte-range requests.
- Download responses use attachment semantics and private/no-store caching.
- Downloaded content is the correct asset.
- Expiring signed delivery URLs cannot be reused after expiry where signed delivery is used.
- Secrets never appear in logs or client bundles.

## 12. Payment acceptance

Use provider sandbox/test mode first. Verify webhook signature validation, duplicate-event handling, successful settlement, failed payment, refund and dispute handling. Never mark an order paid solely because a browser returned from a checkout page; the trusted payment webhook/settlement flow must be authoritative.

## 13. Production deployment

1. Build/deploy from a clean, known Git revision.
2. Configure environment secrets in the hosting platform.
3. Run migrations using the approved deployment procedure.
4. Start the API behind HTTPS/reverse proxy.
5. Confirm `/api/health`.
6. Confirm database connectivity and monitoring.
7. Confirm private media storage.
8. Confirm payment webhooks.
9. Run staging/production smoke tests.
10. Enable public traffic only after acceptance sign-off.

## 14. Updates and rollback

Every meaningful application change must have a clear commit message and regression coverage. Database migrations must be forward-compatible with the deployment strategy. Backups must be verified before high-risk upgrades. Keep a documented rollback plan for application and database changes.

## 15. Final launch gate

Do **not** launch because the storefront looks finished. Launch only when the complete buyer, seller, administrator, payment, entitlement, streaming, download, moderation, payout, backup/recovery and legal/compliance checklists pass in the actual production configuration.
