# Product Release Checklist

## Product
- [ ] All required buyer, seller and admin flows work
- [ ] Responsive UI verified
- [ ] Error states and empty states verified
- [ ] Localization verified
- [ ] Currency formatting verified

## Security
- [ ] Secrets excluded from repository
- [ ] Authentication and authorization tested
- [ ] Admin permissions tested
- [ ] Rate limiting enabled
- [ ] Private media access tested
- [ ] Audit logging enabled where required
- [ ] Dependency/security review completed

## Payments
- [ ] Sandbox checkout tested
- [ ] Successful payment tested
- [ ] Failed payment tested
- [ ] Refund/dispute flow tested
- [ ] Seller payout test completed
- [ ] Live provider approval obtained where required

## Content and moderation
- [ ] Seller verification tested
- [ ] Moderation queue tested
- [ ] Report flow tested
- [ ] Takedown flow tested
- [ ] Region/category restrictions tested
- [ ] Adult-content safeguards tested if enabled

## Operations
- [ ] Database migrations documented
- [ ] Backup completed and restore tested
- [ ] Monitoring configured
- [ ] Email delivery tested
- [ ] Storage/CDN tested
- [ ] Incident procedure documented

## Distribution
- [ ] Production build created
- [ ] Unnecessary development files removed
- [ ] `.env.example` reviewed
- [ ] Installation guide updated
- [ ] User/seller/admin guides updated
- [ ] Security and legal cautions included
- [ ] Third-party licenses/attributions reviewed
- [ ] Version number and changelog prepared
- [ ] ZIP package tested from a clean environment

A release is not ready for sale until the applicable checklist items pass.
