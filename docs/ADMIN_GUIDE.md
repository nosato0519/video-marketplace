# Administrator Guide

## Core responsibilities

The operator controls users, sellers, products, moderation, payments, payouts, localization, regions, settings and security.

## Daily checks

- Review moderation queue
- Review reports and urgent takedowns
- Review failed payments/refunds/disputes
- Review payout exceptions
- Review suspicious login/security events
- Check storage, CDN, email and payment-provider health
- Check backup status

## Seller management

Administrators can review verification status, approve/reject onboarding, suspend sellers, inspect submitted products and manage payout eligibility according to the platform rules.

## Content moderation

Use the moderation workflow rather than editing production data directly. Record decisions and reasons. Preserve appropriate audit records while respecting privacy and retention policies.

## Payments and refunds

Use provider dashboards and the application order record together. Do not manually mark an order as paid unless the supported reconciliation procedure requires it.

## Security

Use separate administrator accounts, least-privilege roles, MFA where available, strong passwords, protected recovery methods and audited administrative actions.

## Configuration changes

Make production configuration changes through the documented configuration mechanism. Never edit secrets into source files.

## Incident response

If a security or content incident is suspected: preserve logs, restrict affected access, stop further exposure when appropriate, investigate, document the incident, notify affected parties where required, and rotate compromised credentials.
