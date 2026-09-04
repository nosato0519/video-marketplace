# VIDORA — Video Marketplace

A production-oriented video marketplace with buyer, seller, payment, entitlement, protected-media, and admin workflows.

## What this system demonstrates

VIDORA is built around a complete marketplace journey rather than a static storefront:

**Buyer** — discover → search/filter → compare → product detail → checkout → paid order → My Library → protected watch/download

**Seller** — creator workspace → create product → media lifecycle → moderation → publish → earnings → payout request

**Admin** — seller verification → product moderation → payout oversight

## Project layout

- `app/` — production-oriented browser frontend
- `backend/` — Node.js API, PostgreSQL access and migrations
- `demo/` — polished, self-contained commercial showcase demo
- `.github/workflows/` — regression CI
- `COMMERCIAL_PACKAGE.md` — commercial deployment and customer hand-off guide

## Requirements

- Node.js 20+
- PostgreSQL
- Payment provider for real checkout
- Production object/file storage for media
- HTTPS in production

## Showcase demo

The demo is designed to be the first thing a prospective customer sees. It is isolated from production credentials and uses simulated payments.

```bash
cd demo
npm install
npm start
```

Open `http://localhost:4173/`.

Recommended presentation order:

1. Buyer storefront and category/search experience
2. Product details and secure checkout
3. Purchased library
4. Protected Watch + Download
5. Seller Creator Studio
6. Product/media lifecycle
7. Admin moderation and seller verification
8. Responsive/mobile presentation

## Production setup

1. Create a PostgreSQL database.
2. Copy `backend/.env.example` to `backend/.env`.
3. Configure `DATABASE_URL` and a strong `SESSION_SECRET`.
4. Configure production storage.
5. Configure payment credentials and webhook signing secret.
6. From `backend/`, run `npm install`.
7. Run `npm run migrate:preflight` and `npm run migrate`.
8. Deploy the API and frontend behind HTTPS/reverse proxy.
9. Run the final browser acceptance checklist before opening sales.

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

CI and HTTP tests are necessary but do not replace final browser acceptance.

## Security principles

- Authentication and role authorization are enforced server-side.
- Media delivery requires an active buyer entitlement.
- Watch/download endpoints must not rely on browser-side purchase state.
- Protected media uses private/no-store delivery and supports range streaming.
- Uploads are validated through the media lifecycle before sale.
- Real credentials and production customer data must never be committed.

## Payment lifecycle

`checkout → provider payment → verified webhook → paid order → entitlement → buyer library`

A browser return URL is not sufficient to grant media access; verified payment state is the source of truth.

## Commercial deployment

See `COMMERCIAL_PACKAGE.md` for the commercial deployment requirements, customer hand-off process, production configuration, and final release checklist.

**Important:** the source is structured for commercial deployment, but a live customer installation still requires customer-specific hosting, PostgreSQL, storage, payment credentials, HTTPS, legal/privacy/compliance configuration, and final browser acceptance. Do not market the demo's simulated payment as live payment processing.
