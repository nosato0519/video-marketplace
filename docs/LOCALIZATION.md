# Localization and Multilingual Documentation

The product and its documentation are designed for international distribution. English is the initial source language. Additional translations must use the same document structure and version as the source.

## Documentation language policy

Each release should provide, where supported:

- English (`en`) — source documentation
- Japanese (`ja`)
- Spanish (`es`)
- Portuguese (`pt-BR`)
- French (`fr`)
- German (`de`)
- Italian (`it`)
- Korean (`ko`)
- Simplified Chinese (`zh-CN`)
- Traditional Chinese (`zh-TW`)

The language list is configurable and may be expanded before release.

## Translation rules

- Do not translate product names, code identifiers, environment variables or API field names unless explicitly documented.
- Preserve warnings, legal caveats and security instructions accurately.
- Never machine-translate a legal requirement and treat the result as authoritative without human review.
- Keep screenshots and UI labels consistent with the language version.
- Keep all translated manuals aligned with the same product version.

## Runtime localization

The application must separate translatable UI strings from application logic. Locale selection must be available to users and administrators. Dates, numbers and currencies must use locale-aware formatting.

## Currency

Currency display and settlement are separate concepts. The storefront may display localized prices while the actual transaction and seller settlement use the configured payment-provider rules.

## Release requirement

A language is only marked as supported when its UI strings and applicable documentation have been reviewed. Unsupported translations must not be presented as complete.
