# VIDORA Video Marketplace — Commercial Package Guide

## Product

VIDORA is a production-oriented video marketplace system covering the complete marketplace lifecycle:

- Buyer: browse → search/filter → product detail → checkout → order → library → protected watch/download
- Seller: creator workspace → product creation → media lifecycle → publishing/moderation → earnings → payout request
- Admin: seller verification → product moderation → payout oversight
- Backend: PostgreSQL persistence, authentication/authorization, entitlement checks, payment lifecycle, protected media delivery

## What the customer receives

The commercial ZIP should contain the complete repository source, including:

- `app/` — customer-facing browser application
- `backend/` — API, database access and migrations
- `demo/` — self-contained showcase demo
- `.github/workflows/` — automated regression checks
- deployment and environment documentation

Do not ship real credentials, private keys, customer data, or production media inside the package.

## Demo-first sales experience

The `demo/` application is intended to be the sales showcase. It uses a simulated payment environment and isolated demo sessions, while exercising the same product concepts the production system implements.

Launch locally:

```bash
cd demo
npm install
npm start
```

Then open `http://localhost:4173/`.

The showcase should be presented in this order:

1. Buyer storefront — demonstrate search, category browsing and product details.
2. Secure purchase — complete a simulated purchase.
3. My Library — show the purchased item appearing immediately.
4. Watch + Download — demonstrate entitlement-protected media access.
5. Seller Studio — create a product and run the media lifecycle.
6. Admin Console — approve the product/seller and review payout operations.

## Customer deployment requirements

The buyer must configure their own production environment before going live:

- Node.js 20+
- PostgreSQL
- HTTPS and a production reverse proxy/runtime
- Production object/file storage for video media
- Payment provider account and webhook signing secret
- Secure `SESSION_SECRET`
- Production database/storage/payment credentials

The system must not be represented as live-payment-ready until the buyer has supplied and verified those production integrations.

## Commercial hand-off checklist

Before handing a ZIP to a customer:

- [ ] Remove `.env` files containing real secrets.
- [ ] Confirm database migrations are included.
- [ ] Confirm automated tests pass.
- [ ] Confirm demo starts from a clean install.
- [ ] Confirm buyer watch/download authorization works.
- [ ] Confirm seller ownership boundaries work.
- [ ] Confirm admin-only operations reject non-admin sessions.
- [ ] Confirm production storage and payment configuration are documented.
- [ ] Set the final commercial license and redistribution terms.
- [ ] Replace demo branding, legal pages, support contacts and service credentials for the customer.
- [ ] Perform final browser acceptance on desktop and mobile.

## Important distinction

The showcase demo is designed to sell and explain the product. It does not contain real payment credentials or production customer data. A production launch requires the deployment, payment, storage, secrets and legal/compliance steps above.
