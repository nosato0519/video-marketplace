# No-code administration requirements v0.1

The operator must be able to run routine marketplace operations without programming knowledge. Code, SQL, server shells and deployment details must not be required for ordinary daily management.

## Admin dashboard
Provide plain-language sections:
- Overview
- Orders and sales
- Products
- Sellers
- Buyers
- Moderation
- Reports
- Payouts
- Discounts
- Categories
- Languages
- Currencies
- Regions
- Notifications
- Site content
- Settings
- Security/activity log
- Help

## Visual management
Where safe and appropriate, settings should use forms, toggles, dropdowns, date pickers, search, filters and previews rather than raw configuration files.

Examples:
- Create/edit a category with a form.
- Change a platform fee using a validated percentage/amount field.
- Enable a language with a toggle.
- Set supported currencies with a selector.
- Restrict a product by country using a country selector.
- Feature a product using a visual selection screen.
- Pause a seller or product with a clear reason and confirmation.
- Edit public policy/help pages using a controlled content editor.

## Guardrails
- Validate input on the server.
- Explain the impact of high-risk settings before saving.
- Require confirmation for destructive actions.
- Require re-authentication/step-up authentication for especially sensitive actions.
- Record every administrative change in an audit log.
- Support undo/reversal where technically and financially safe.
- Never expose secrets or raw credentials in forms.
- Separate ordinary settings from dangerous infrastructure/security settings.

## Guided setup
A new installation should have a setup wizard covering:
1. Site name and branding
2. Operator information
3. Default language
4. Supported languages
5. Default/display currencies
6. Regions/countries
7. Seller rules and platform fee
8. Payment provider configuration
9. Storage/video processing configuration
10. Email/notification configuration
11. Legal/policy pages
12. Moderation defaults
13. Security checks
14. Test mode/sandbox verification

The wizard must explain what each setting means and distinguish required settings from optional settings.

## Health and troubleshooting
The dashboard should provide human-readable status checks for database, storage, video processing, email and payment integrations. When a check fails, show the likely cause and the next safe action. Do not require the operator to inspect server logs for routine issues.

## Advanced mode
An advanced section may expose technical diagnostics to experienced operators, but the normal admin experience must remain no-code. Advanced access must not weaken server-side authorization.
