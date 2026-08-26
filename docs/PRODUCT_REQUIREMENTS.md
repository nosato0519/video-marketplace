# Product requirements

## Primary market

The marketplace is international-first. English is the default customer experience, with Japanese supported for Japan-based buyers and operators.

## Buyer journey

Discover → search/filter → product detail → preview → checkout → payment confirmation → library → streaming → download.

A paid buyer must be able to access purchased media from the library without exposing a permanent public media URL.

## Seller journey

Seller onboarding → rights/compliance declarations → media upload → validation/scanning → product metadata → moderation → approval → publication → sales → earnings → payout.

## Operator journey

Dashboard → users/sellers → products/moderation → orders/payments → refunds/entitlements → reports/takedowns → payouts → audit logs → system health.

## Commercial quality bar

The deliverable is a sellable web system, not a visual demo. Core flows must have server-side authorization, validation, error handling, tests, auditability, secure configuration, deployment documentation, operator documentation, buyer documentation and seller documentation.

## International requirements

Use explicit locale, currency and timezone data. Never depend on formatted currency strings or browser locale for financial records. English fallback is required for untranslated product content. Country/payment/tax availability must be configurable and must not be advertised until the selected payment provider and deployment's legal/compliance requirements have been reviewed.

## Media protection

Original media remains private. Streaming and download authorization must be based on an active entitlement. Signed/temporary access is preferred over permanent public URLs. Refunded or revoked entitlements must lose access.

## Definition of done

A release is not considered production-ready until the buyer, seller, operator and payment/media flows are integrated end-to-end, security tests pass, backups and restore procedures are verified, and the required legal/compliance documents and operational manuals are included in the distribution package.
