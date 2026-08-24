# Release Checklist V1

## Product completeness
- [ ] Buyer flow works end-to-end
- [ ] Seller onboarding works end-to-end
- [ ] Product upload/review/publish works
- [ ] Admin routine operations work on desktop and mobile
- [ ] Protected media authorization works
- [ ] Payment sandbox flow is verified server-side
- [ ] Refund/revocation behavior is tested
- [ ] Multilingual UI has no missing keys in supported languages
- [ ] Currency formatting is locale-aware

## Installation
- [ ] Clean-server installation completed using only customer documentation
- [ ] Prerequisite checks work
- [ ] First admin can be created
- [ ] Database migrations succeed
- [ ] Storage/email/payment/video-processing configuration is documented and validated
- [ ] Reinstall protection works

## Security
- [ ] Authorization tests pass
- [ ] IDOR/BOLA tests pass
- [ ] Privilege separation tests pass
- [ ] Protected media cannot be fetched without entitlement
- [ ] Rate limiting is active on sensitive endpoints
- [ ] Production secrets are absent from source, bundles and logs
- [ ] HTTPS/secure-cookie requirements are documented
- [ ] Backup/restore has been tested

## UX
- [ ] Loading/empty/error/permission-denied states are complete
- [ ] Keyboard navigation works for core flows
- [ ] Mobile core flows work without horizontal scrolling
- [ ] Long translations do not break layouts
- [ ] Double-submit is prevented on purchase and destructive actions

## Documentation
- [ ] Installation manual
- [ ] Admin manual
- [ ] Seller manual
- [ ] Buyer/help guide
- [ ] Troubleshooting guide
- [ ] Security guide
- [ ] Update/rollback guide
- [ ] Backup/restore guide
- [ ] License and third-party notices
- [ ] Known limitations and external service requirements

## Sales package
- [ ] ZIP contains only intended distributable files
- [ ] No private keys, credentials, local databases or development secrets
- [ ] README provides a clear quick start
- [ ] Version and release notes are included
- [ ] License terms match the sales offer
- [ ] Supported environments are explicitly listed
- [ ] Optional integrations are clearly marked

## Final gate
Do not publish the ZIP until a clean-install test, critical E2E tests and security regression suite pass. Any failure that could cause a buyer to believe the product is broken, unusable or materially different from the sales description blocks release until resolved or explicitly disclosed.
