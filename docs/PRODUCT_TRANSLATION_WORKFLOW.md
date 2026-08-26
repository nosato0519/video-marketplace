# Product translation workflow

## Goal

Sellers and authorized operators can maintain localized product titles and descriptions without changing order, payment, entitlement, or media-access logic.

## Rules

- A translation belongs to exactly one product and one enabled locale.
- The locale must be enabled before a translation can be created or updated.
- Translation records are keyed by `(product_id, locale)` so repeated saves update the same translation.
- Removing a translation does not remove the product.
- Missing translations use the catalog fallback policy.
- Financial values are not translated; amount and ISO currency code remain canonical data.

## Required permissions

The eventual API route must allow the product owner and authorized marketplace operators to edit translations. Buyers must never be able to modify them.

## Recommended UI

Product editor → Languages → locale list → title/description fields → translation completeness indicator → save.

Show the default English translation prominently and indicate missing translations without blocking publication unless the marketplace's moderation policy explicitly requires a particular locale.

## QA

Before publication, check each enabled translation for:

- title and description completeness
- inappropriate or misleading translation
- HTML/script injection
- excessively long text
- broken links or formatting
- consistency with the source product

Localization must never bypass product moderation, seller status, payment rules, entitlement checks, or media authorization.
