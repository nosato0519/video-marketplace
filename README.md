# Video Marketplace

A production-oriented video marketplace with buyer, seller, payment, entitlement, media-access, and admin workflows.

## Requirements

- Node.js 20+
- PostgreSQL
- A payment provider when real checkout is enabled
- Object/file storage for production media

## Project layout

- `app/` — browser frontend
- `backend/` — Node.js API and database migrations
- `.github/workflows/` — regression CI

## Local setup

1. Create a PostgreSQL database.
2. Copy `backend/.env.example` to `backend/.env`.
3. Fill in `DATABASE_URL` and a strong `SESSION_SECRET`.
4. Configure storage and payment settings only when those services are ready.
5. From `backend/`, install dependencies with `npm install`.
6. Run `npm run migrate:preflight`, then `npm run migrate`.
7. Start the API with `npm run dev`.

The frontend is currently a static browser application under `app/`; serve it with your preferred static web server during local development or deploy it behind the production web server/reverse proxy.

## Verification

From `backend/`:

```bash
npm test
npm run test:http-auth
npm run test:http-buyer-purchase-e2e
npm run test:http-media-access-e2e
npm run test:http-seller-product-media-e2e
npm run test:http-buyer-order-report-e2e
npm run test:http-seller-profile-earnings-payout-e2e
```

Payment webhook acceptance tests require the payment test configuration described by the environment used by CI.

## Production secrets

Never commit real credentials. At minimum, configure:

- `DATABASE_URL`
- `SESSION_SECRET`
- payment-provider credentials/secrets
- webhook signing secret
- production storage credentials

Use separate credentials for development, staging, and production.

## Media security

Media access is authorization-controlled. A buyer must have an active entitlement before protected streaming/download endpoints should return purchased content. Uploads are streamed to storage and validated before becoming ready for sale.

## Payment lifecycle

A successful provider webhook is the source of truth for completing payment. The expected lifecycle is:

`checkout → provider payment → verified webhook → paid order → entitlement → buyer library`

Do not grant media access merely because a browser returned to a success URL.

## Browser acceptance

CI and HTTP acceptance tests do not replace browser acceptance. Before a commercial release, manually verify buyer, seller, and admin journeys in a real browser, including responsive layouts and protected media access.

## License / commercial packaging

Review and set the final commercial license, deployment terms, third-party service requirements, and privacy/compliance documents before distributing a paid ZIP package.
