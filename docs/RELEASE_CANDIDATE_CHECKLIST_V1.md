# Release Candidate Checklist V1

## Objective
Define the final gate before the first commercial ZIP is created.

## Product
- [ ] Buyer flow works end-to-end.
- [ ] Seller flow works end-to-end.
- [ ] Admin flow works end-to-end.
- [ ] Mobile core workflows are usable.
- [ ] Japanese and English documentation matches the release.

## Security
- [ ] Authentication/authorization tests pass.
- [ ] Protected media tests pass.
- [ ] Payment/webhook integrity tests pass.
- [ ] Upload security tests pass.
- [ ] Secrets scan passes.
- [ ] Sensitive logs are reviewed.
- [ ] Rate limiting and abuse controls are verified.

## Operations
- [ ] Backup restore test passes.
- [ ] Upgrade from supported previous release passes.
- [ ] Failure/recovery procedure is tested.
- [ ] Health checks pass after clean installation.

## Distribution
- [ ] Version is fixed.
- [ ] ZIP contains all required files.
- [ ] No development secrets or private customer data are included.
- [ ] License is included.
- [ ] Release notes are included.
- [ ] Known limitations are included.
- [ ] Compatibility requirements are included.
- [ ] Installation/manual links and references are correct.

## Sales claims
Every claim on the sales page must map to a verified feature or documented capability. Do not promise absolute security, guaranteed piracy prevention, guaranteed payment-provider availability, or universal legal compliance.

## Final status
Only after every mandatory gate has evidence should the package be labeled `release-candidate` and prepared for clean-environment verification.
