# Backend/API Boundaries v0.1

The backend will be organized around domain boundaries rather than allowing UI code to directly manipulate database records.

## Auth
- register
- login
- logout
- password reset
- session management
- MFA hooks

## Catalog
- list products
- search/filter
- product detail
- category listing
- seller profile

## Buyer
- library
- favorites
- orders
- account settings

## Seller
- seller onboarding
- verification state
- product CRUD
- media upload initiation
- moderation submission
- sales/earnings
- payout requests

## Admin
- users
- sellers
- moderation
- reports
- orders/refunds
- payouts
- categories
- regions
- localization
- audit logs

## Commerce
- create checkout
- payment provider callback/webhook
- order finalization
- refund
- payout calculation

## Media
- initiate upload
- upload completion
- processing status
- authorized playback session
- authorized download session

## Security rules
- Server-side authorization is mandatory for every protected operation.
- Payment webhooks must be authenticated and idempotent.
- Media URLs must be short-lived or otherwise access-controlled.
- Sensitive operations should generate audit events.
- API responses must not expose private storage keys, secrets or unnecessary personal data.
