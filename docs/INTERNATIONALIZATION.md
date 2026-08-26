# Internationalization and global sales policy

## Product direction

The marketplace is designed primarily for international buyers, while remaining usable for Japanese buyers. English is the default customer-facing language; Japanese is a supported language, not a separate product.

## Required product behavior

- Store user and product locale separately from the UI language.
- Store monetary values with an explicit ISO 4217 currency code.
- Never infer a currency from a formatted price string.
- Keep timestamps timezone-aware and store canonical timestamps in UTC.
- Product translations must be keyed by product and locale.
- Fall back to English when a requested translation is unavailable.
- Avoid hard-coded Japanese text in customer-facing business logic.
- Customer emails and transactional messages must have localized templates.

## Checkout and payments

The checkout layer must treat the payment provider's supported countries, currencies, payment methods, tax requirements, refunds, chargebacks, and prohibited-business rules as deployment constraints. Do not advertise a payment method or country as supported until the configured provider and legal/compliance review confirm it.

## Downloads and media

Purchased media access is independent of the buyer's locale. Authorization is based on the authenticated account and active entitlement, not geography or language.

## Operations

Before opening sales internationally, the operator must configure:

- supported countries/regions
- settlement currency and seller payout currency
- payment provider account
- tax/VAT/GST handling as applicable
- privacy and cookie disclosures
- terms of service and refund policy
- content moderation and takedown workflow
- customer support contact and response process

Country availability must be maintained as configuration rather than hard-coded in the frontend so the service can be changed without rewriting the application.
