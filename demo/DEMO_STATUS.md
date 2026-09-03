# VIDORA Demo Status

The functional demo is a real Node.js HTTP application, not a static HTML mock.

## Implemented

- Buyer catalog/search/category browsing
- Product detail and secure demo checkout
- Paid order + entitlement state transition
- Buyer library and order history
- Entitlement-protected Watch
- Entitlement-protected Download
- Unauthorized media rejection
- Seller product creation
- Seller media upload/validation lifecycle
- Seller payout request
- Admin product moderation
- Admin seller approval
- Session-scoped role switching
- Production-style light responsive UI
- Education, Film, Business, Creative and clearly labeled 18+ Adult catalog imagery
- Codespaces port 4173 auto-start through the launcher

## Verification

`npm --prefix demo run verify` is the canonical functional demo E2E verifier. It starts `demo/launcher.mjs` and verifies the browser entrypoint/assets plus Buyer, Seller, Admin, protected Watch/Download, and unauthorized-media flows.

An earlier version of the verifier has an observed CI PASS in Backend Regression run `33723997514`. Changes made after that run must be re-verified before calling the latest commit fully green.

## Release boundary

This demo intentionally simulates money movement and uses in-memory demo state. It is not a production payment environment. Production release still requires the deployment-specific PostgreSQL, session secrets, storage, Stripe credentials/webhook secret, backup/restore, HTTPS and real-browser gates documented in `RELEASE_READINESS.md`.
