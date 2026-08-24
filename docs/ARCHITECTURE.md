# Application Architecture Plan

## Goal
Move the project from the single-file visual prototype to a maintainable production-oriented application that can later be packaged for resale.

## Main domains
- Buyer storefront
- Authentication and accounts
- Seller portal
- Product/catalog management
- Orders and checkout
- Video delivery
- Moderation and reports
- Administration
- Localization and currency
- Notifications
- Payments and payouts
- Audit/security

## Page map

### Public
- Home
- Browse
- Search results
- Category
- Product detail
- Seller profile
- Login
- Register
- Password reset
- Legal/policy pages

### Buyer
- Dashboard
- Library
- Orders
- Favorites
- Account settings

### Seller
- Dashboard
- Products
- New product
- Product editor
- Sales
- Earnings/payouts
- Verification
- Seller profile
- Settings

### Admin
- Dashboard
- Users
- Sellers
- Products/moderation
- Reports
- Orders/refunds
- Payouts
- Categories
- Localization
- Currencies
- Regions
- Settings
- Audit/security logs

## Architecture rules
- Keep presentation, domain logic and external integrations separated.
- Never expose private video storage credentials to the browser.
- Keep payment-provider adapters replaceable.
- Keep localization strings outside application logic.
- Use role-based authorization on the server, not only UI hiding.
- Treat admin actions as auditable operations.
- Avoid vendor lock-in where practical by using adapter interfaces for storage, payments, email and video delivery.

## Build sequence
1. Application shell and routing
2. Localization runtime
3. Reusable design system
4. Authentication boundaries
5. Database/domain model
6. Buyer catalog
7. Seller portal
8. Admin portal
9. Orders/checkout
10. Private video delivery
11. Moderation/reporting
12. Payouts
13. Security hardening
14. Documentation and clean-install release test
