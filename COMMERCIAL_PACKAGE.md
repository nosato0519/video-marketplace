# VIDORA Video Marketplace — Commercial Deployment Guide

## Product

VIDORA is a production-oriented video marketplace system covering the complete marketplace lifecycle:

- Buyer: browse → search/filter → product detail → checkout → order → library → protected watch/download
- Seller: creator workspace → product creation → media lifecycle → publishing/moderation → earnings → payout request
- Admin: seller verification → product moderation → payout oversight
- Backend: PostgreSQL persistence, authentication/authorization, entitlement checks, payment lifecycle, protected media delivery

## Repository hand-off

The customer receives the repository source and deployment documentation through the agreed repository access or source-delivery channel. No generated archive is required for the normal development or hand-off workflow.

The repository includes:

- `app/` — customer-facing browser application
- `backend/` — API, database access and migrations
- `demo/` — self-contained showcase demo
- `.github/workflows/` — automated regression checks
- deployment and environment documentation

Do not commit or transfer real credentials, private keys, customer data, or production media through the source repository.

## Demo-first sales experience

The `demo/` application is intended as the sales showcase. It uses a simulated payment environment and isolated demo sessions, while exercising the same product concepts the production system implements.

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

The repository has passed the recorded automated showcase and application acceptance gates. Final customer-production steps remain intentionally separate.

- [x] No real credentials are committed; repository checks block `.env` files and known secret patterns.
- [x] Database migrations are included in the repository.
- [x] Automated acceptance gates passed at the recorded release checkpoint.
- [x] Showcase demo clean-install and functional regression passed.
- [x] Buyer watch/download authorization is covered by automated regression.
- [x] Seller ownership boundaries are covered by automated regression.
- [x] Admin-only operations are covered by automated regression.
- [x] Production storage and payment configuration requirements are documented.
- [x] Current commercial license and redistribution terms are present in `LICENSE.md`.
- [ ] Replace demo branding, legal pages and support contacts for the specific customer when applicable.
- [ ] Provision customer-specific production secrets through a secure channel.
- [ ] Provision customer production hosting, PostgreSQL and protected media storage.
- [ ] Configure the production payment provider and signed webhook endpoint.
- [ ] Perform final real-deployment browser acceptance on desktop and mobile.

## Important distinction

The showcase demo is designed to sell and explain the product. It does not contain real payment credentials or production customer data. A production launch requires the deployment, payment, storage, secrets and legal/compliance steps above.
