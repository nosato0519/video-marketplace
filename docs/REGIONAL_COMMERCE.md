# Regional commerce requirements v0.1

The marketplace is designed for both Japan and international sales. Region support is configuration, not a separate product.

## Japan
- Japanese UI and Japanese product metadata are supported.
- JPY must be supported as a display and transaction currency where the selected payment provider supports it.
- Japanese customer-facing order totals, receipts and dates must use appropriate Japanese locale formatting.
- Tax, invoicing, consumer-protection, privacy, age/content and business disclosure requirements must be reviewed for the actual operating entity and launch model before production.

## International
- English is the initial default locale.
- Additional locales can be enabled without changing product records.
- Currency display and actual settlement/charge currency are explicitly separated.
- Region availability can be configured by country/market.
- Payment methods are provider-dependent and must be enabled only where the provider and business model permit them.

## UX rule
A buyer should not have to understand which backend provider handles the payment. The checkout should present the methods available to that buyer's region and clearly show the final charge currency and amount before confirmation.

## Compliance rule
This document is an engineering requirement, not legal advice. Before launching in Japan or any other country, the operator must obtain current professional/legal/tax advice appropriate to the actual business entity, content categories, payment providers and jurisdictions.
