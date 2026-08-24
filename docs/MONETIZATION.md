# Monetization Architecture

The platform is intended to become a revenue-generating marketplace for its operator. Monetization must be implemented as a configurable business layer rather than hard-coded into individual screens.

## Revenue sources

1. Platform commission on seller sales
2. Optional seller listing or processing fees, if enabled
3. Promotional/featured placement fees, if enabled
4. Optional bundles/discount campaigns
5. Other operator-approved marketplace services

## Seller settlement

For each completed order, calculate and persist:
- gross item amount
- discounts
- taxes/fees where applicable
- payment processing cost where available
- platform commission
- seller net amount
- currency
- settlement status

Historical order and settlement records must not change when the current fee configuration changes.

## Refunds and disputes

Refunds must reverse or adjust the associated seller/platform settlement according to the configured policy. Payment-provider webhooks must be idempotent so the same event cannot create duplicate orders or payouts.

## Payout controls

- Seller payout eligibility is configurable.
- Minimum payout threshold is configurable.
- Payout status must be auditable.
- Failed payouts must not silently disappear.
- Operator can suspend payouts for compliance or dispute reasons.
- Payout provider integrations must be replaceable.

## Currency

The storefront supports multiple display currencies. Transaction and settlement currencies must follow the selected payment-provider and business rules. Exchange-rate conversion must be explicit and recorded when it affects settlement calculations.

## Important launch requirement

No live payment provider should be enabled until its current terms, supported countries, supported currencies, prohibited/restricted content rules and merchant requirements have been reviewed for the actual business model. Adult-content support cannot be assumed merely because a provider supports ordinary video sales.
