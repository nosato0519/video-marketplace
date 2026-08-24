# Release acceptance checklist v0.1

The application is not considered ready for sale until all applicable items are verified in a clean environment.

## Installation
- [ ] Clean installation from the distribution package
- [ ] Requirements are detected and explained
- [ ] Setup wizard completes without editing source code
- [ ] Required environment variables are documented and validated
- [ ] Database migrations run safely
- [ ] No demo credentials or private project data are included

## Admin
- [ ] Admin can complete routine operations without programming knowledge
- [ ] Admin UI works on desktop and smartphone
- [ ] Seller approval/rejection workflow works
- [ ] Product moderation works
- [ ] Orders/refunds can be reviewed safely
- [ ] Payouts can be reviewed
- [ ] Language/currency/region settings are manageable visually
- [ ] Audit log records sensitive actions

## Seller
- [ ] Seller registration and verification work
- [ ] Draft can be saved and resumed
- [ ] Video upload and processing status are clear
- [ ] Product can be submitted for review
- [ ] Fees and expected proceeds are understandable
- [ ] Approved product can be published
- [ ] Sales and payout status are understandable

## Buyer
- [ ] Catalog search/filter works
- [ ] Product details clearly show price and delivery method
- [ ] Checkout works in sandbox/test mode
- [ ] Payment interruption has a safe recovery path
- [ ] Purchase appears in the buyer library
- [ ] Authorized streaming/download works
- [ ] Mobile buyer flow is usable

## International
- [ ] English and Japanese flows are reviewed
- [ ] Other shipped locales render without broken strings
- [ ] Currency display is locale-aware
- [ ] Region restrictions are enforced server-side

## Security
- [ ] Authentication and authorization tests pass
- [ ] Private media cannot be accessed without entitlement
- [ ] Sensitive admin actions require appropriate confirmation/re-authentication
- [ ] Rate limiting and abuse controls are enabled
- [ ] Secrets are externalized
- [ ] Security headers and secure cookie settings are verified

## Commercial release
- [ ] Third-party licenses/attributions are complete
- [ ] Software license is selected and included
- [ ] Documentation is included
- [ ] Changelog/release notes are included
- [ ] Backup/restore procedure has been tested
- [ ] Upgrade/migration procedure has been tested
- [ ] ZIP extracts and runs in a clean test environment
- [ ] Final package contains no operator secrets, real user data or private test media

## Important
Passing this checklist does not itself establish legal compliance for a particular country, business model or adult-content operation. Before a real launch, the operator must verify applicable laws, taxes, privacy/consumer rules, age/consent requirements and payment-provider policies for the actual deployment.
