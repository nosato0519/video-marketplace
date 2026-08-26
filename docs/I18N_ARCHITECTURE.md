# Internationalization architecture

## Goal

The marketplace is international-first but is not limited to English and Japanese. The application must support adding additional locales without changing business logic or duplicating the application.

## Locale model

Use BCP 47 locale identifiers where appropriate, for example:

- `en`
- `ja`
- `zh-CN`
- `zh-TW`
- `ko`
- `es`
- `fr`
- `de`
- `it`
- `pt-BR`

The supported-locale list is configuration/data, not a hard-coded conditional spread through the UI.

## Separation of concerns

Keep these concepts separate:

1. **Interface locale** — language used by the UI and system messages.
2. **Content locale** — language of product title/description and other seller-provided content.
3. **Country/region** — used for availability, tax and payment rules.
4. **Display currency** — how prices are presented to the buyer.
5. **Settlement currency** — currency used by the payment/payout configuration.
6. **Timezone** — how dates/times are presented; financial timestamps remain canonical UTC values.

Never infer one of these values solely from another.

## Translation storage

System translations should use stable message keys rather than embedding translated strings inside business logic. Product and seller content translations should be stored as locale-specific records keyed by the owning entity and locale.

Recommended fallback order:

1. requested locale
2. requested language without region
3. `en`
4. explicitly configured system fallback

The fallback must be deterministic and must never silently change the stored financial or legal data.

## Adding a language

Adding a locale should require only:

1. registering the locale;
2. adding system-message translations;
3. adding required legal/transactional templates;
4. enabling the locale after QA.

No payment, entitlement, media authorization, or order logic should need to be rewritten merely because a locale is added.

## Formatting

Use locale-aware formatting for numbers, dates and times. Financial records must retain exact numeric values and ISO 4217 currency codes; formatted strings are presentation only.

## Quality requirements

Before enabling a new locale, test navigation, authentication, validation errors, checkout, receipts, library, streaming/download controls, seller workflows, moderation, account settings, emails, legal pages, right-to-left behavior where applicable, long translated strings, and missing-translation fallback.
