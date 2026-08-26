# Product translation API contract

The translation API is an authenticated seller/admin feature. Buyers may read localized public product content but cannot create, update, or delete translations.

## Routes

- `GET /api/products/:productId/translations` — seller/admin only for the editable management view.
- `PUT /api/products/:productId/translations/:locale` — seller/admin only; creates or updates one locale.
- `DELETE /api/products/:productId/translations/:locale` — seller/admin only; removes one translation.

## Authorization

A seller may edit translations only for products they own. An administrator may edit translations for any product. Authorization must be evaluated from the authenticated server-side user and the product's stored `seller_id`.

## Validation

- product must exist;
- locale must be enabled;
- title is required;
- title and description must be validated and safely rendered as text/approved markup;
- request size must be bounded;
- buyers cannot mutate translations.

## Audit

Translation mutations should record actor, product, locale, operation, timestamp, and success/failure in the existing audit system.

## Security

Translation endpoints must not grant access to private media, change product ownership, change price/currency, bypass moderation, or alter entitlements. Those concerns remain separate permissions.
