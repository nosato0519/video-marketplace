# VIDORA Functional Sales Demo

This folder is a **functional sales demo**, not a screenshot-only showcase.

## Run

```bash
cd demo
npm start
```

Open `http://localhost:4173`.

Node.js 20+ is required. The demo server uses only Node's built-in modules.

## What can be tested

- Buyer: browse/search/categories, product detail, demo checkout, order state, entitlement, protected streaming, protected download.
- Seller: product creation, media lifecycle, earnings view, payout request, profile/verification state.
- Admin: moderation, seller verification, payout view, security checks.
- Adult and non-adult catalog categories are included; the Adult example uses a non-explicit 18+ visual.
- The demo includes a real WebM asset and a protected HTTP media endpoint with range support.

## Important

Payments and identities are simulated in demo mode. This is intentional so a prospective customer can safely exercise the whole workflow without real money or credentials.

The main production application remains separate and uses PostgreSQL, protected media storage, and configured payment providers. This demo is the sales/acceptance environment for demonstrating the system before purchase.
