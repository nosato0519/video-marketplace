# Locale administration API contract

This document defines the application-layer contract for the admin locale screen. The final HTTP route must be protected by the existing admin authorization middleware.

## List locales

`GET /api/admin/locales`

Returns enabled and disabled locales with:

- `locale`
- `languageName`
- `nativeName`
- `enabled`
- `isDefault`
- `createdAt`

## Add or enable locale

`POST /api/admin/locales`

Request:

```json
{
  "locale": "es-MX",
  "languageName": "Spanish (Mexico)",
  "nativeName": "Español (México)"
}
```

The server validates the BCP 47-style identifier and names, then creates or re-enables the locale.

## Enable/disable locale

`PATCH /api/admin/locales/:locale`

Request:

```json
{ "enabled": false }
```

The default locale cannot be disabled. Disabling a locale does not delete product translations.

## Security requirements

- Require an authenticated administrator.
- Apply CSRF protection where cookie authentication is used.
- Validate all locale input server-side.
- Do not trust a locale sent by the browser for authorization.
- Audit locale changes with administrator ID, timestamp and old/new state.
- Rate-limit administrative mutation endpoints.
