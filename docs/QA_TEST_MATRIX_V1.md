# QA Test Matrix V1

## Purpose
Turn the project's quality goals into a repeatable release test matrix covering buyer, seller, administrator, security and deployment behavior.

## Buyer
- [ ] Browse published products
- [ ] Product detail works on desktop/mobile
- [ ] Currency and price display are correct
- [ ] Checkout success
- [ ] Checkout failure/cancel
- [ ] Duplicate submit is safe
- [ ] Order appears once
- [ ] Purchase appears in library
- [ ] Authorized playback works
- [ ] Unauthorized playback is denied
- [ ] Refund/revocation follows policy
- [ ] Empty/error states are understandable

## Seller
- [ ] Onboarding
- [ ] Create draft
- [ ] Private upload
- [ ] Interrupted upload recovery where supported
- [ ] Metadata validation
- [ ] Price validation
- [ ] Submit for review
- [ ] Rejection reason and edit flow
- [ ] Publish after approval only
- [ ] Sales/payout visibility
- [ ] Seller cannot access another seller's resources

## Administrator
- [ ] Login and role restrictions
- [ ] Seller review
- [ ] Product moderation
- [ ] Reports/takedown
- [ ] Order/refund review
- [ ] Payout review
- [ ] Audit log
- [ ] Health diagnostics
- [ ] Mobile core actions
- [ ] Destructive-action confirmations

## Security
- [ ] Cross-user object access tests
- [ ] Privilege escalation tests
- [ ] Rate-limit tests on high-risk endpoints
- [ ] Invalid/expired session tests
- [ ] Webhook signature tests
- [ ] Duplicate webhook tests
- [ ] Client price tampering tests
- [ ] Private media direct-access tests
- [ ] Upload validation tests
- [ ] Secret/source scan
- [ ] Sensitive log redaction

## Deployment
- [ ] Clean install from distribution package
- [ ] Environment validation
- [ ] Database migration
- [ ] Storage configuration
- [ ] Payment provider configuration
- [ ] Email configuration
- [ ] HTTPS/proxy guidance
- [ ] Backup and restore
- [ ] Update/migration path
- [ ] Uninstall/rollback documentation where supported

## Release rule
A release candidate is not commercially packaged until all mandatory checks pass or an explicitly documented exception is approved. Test evidence must be retained with the release notes.
