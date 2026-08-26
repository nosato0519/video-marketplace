# Locale administration guide

## Purpose

The operator can manage which languages are available to customers without changing commerce or media code.

## Add a language

Provide:

- BCP 47 locale identifier (for example `nl`, `sv`, `pl`, `ar`, or `th`)
- language name in English
- native language name

Enable the locale only after the required UI, transactional-email, legal and support translations have passed QA.

## Disable a language

Disabling a locale prevents it from being offered as a new customer UI choice. The default locale cannot be disabled. Existing user preferences should resolve through the normal fallback mechanism.

Disabling a locale does not delete product translations. This preserves seller content and allows the locale to be re-enabled later.

## Adding product translations

For each product, a seller/operator can create a translation record containing at least a title and description. The product remains available when a translation is missing because the catalog uses deterministic locale fallback.

## QA before enabling

Check:

- navigation and buttons
- authentication and validation messages
- search and filters
- product details
- checkout and payment messaging
- buyer library
- streaming and download controls
- seller dashboard
- moderation screens
- transactional email templates
- legal pages
- long text and date/number formatting
- right-to-left layout where applicable

## Important

Language availability is configuration. It must never be used as a security boundary. Authorization, payment, entitlement and media-access decisions remain independent of locale.
