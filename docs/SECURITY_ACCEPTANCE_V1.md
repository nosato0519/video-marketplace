# Security Acceptance Checklist V1

Before release, the marketplace must pass these baseline checks.

## Authentication
- Passwords are never stored in plaintext.
- Sessions can be revoked.
- Sensitive admin/seller actions can require step-up authentication.
- Authentication endpoints are rate-limited.

## Authorization
- Buyer, seller, moderator and admin permissions are separated.
- Every protected API checks authorization server-side.
- Object IDs cannot be used to access another user's order, media or payout by changing the ID.

## Media
- Original media is private.
- Protected playback/download requires an active entitlement.
- Expired/revoked access is rejected.
- Signed access is short-lived where supported.
- No storage credentials are shipped to browsers.

## Commerce
- Client-side prices are never trusted.
- Payment success is verified server-side.
- Payment events are idempotent.
- Refunds and chargebacks can revoke or suspend access according to policy.
- Payment secrets are stored only in server-side configuration.

## Admin
- Privileged actions are audited.
- Destructive actions require confirmation.
- Sensitive seller verification data is restricted to authorized roles.
- Admin UI works on mobile without requiring horizontal scrolling for routine actions.

## Abuse
- Login, checkout and media endpoints have rate limits.
- Download anomalies can be reviewed.
- Content can be taken down quickly.
- Seller reports of unauthorized redistribution are supported.

## Deployment
- Production secrets are not committed.
- Debug mode is disabled in production.
- Secure cookies and HTTPS are documented as deployment requirements.
- Database backups and restore procedures are documented.
- Dependencies receive security updates before release.

## Release rule
A feature is not considered complete merely because its UI exists. It must have server-side authorization, error handling, auditability where appropriate, and an acceptance test covering the critical path.
