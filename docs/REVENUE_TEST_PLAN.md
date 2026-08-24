# Revenue-Critical Test Plan v0.1

The following scenarios must pass before a production monetization release.

## Purchase
- Buyer can purchase an available product.
- Payment success creates exactly one completed order.
- Payment failure creates no completed order.
- Refreshing a payment return page does not duplicate an order.
- Buyer receives access only after verified payment state.

## Seller accounting
- Seller receives the correct gross item amount.
- Platform commission is calculated from the configured rule.
- Historical orders retain their original fee snapshot.
- Multiple sellers in one order are accounted for independently.
- Refunds correctly adjust seller/platform amounts.

## Payouts
- Eligible seller can request a payout.
- Ineligible/suspended seller cannot bypass payout restrictions.
- Duplicate payout callbacks do not create duplicate settlements.
- Failed payout remains visible and recoverable.

## Currency
- Display currency formatting is correct for supported locales.
- Transaction currency is recorded.
- Conversion, when used, records the rate and timestamp required for reconciliation.

## Abuse/security
- Unauthorized user cannot access another user's purchase.
- Unauthorized user cannot access private media.
- Seller cannot access another seller's earnings.
- Admin-only operations reject ordinary users.
- Upload and login abuse protections work.

## Release gate
No production payment credentials are used until the complete test suite passes in a sandbox/staging environment and the selected provider's current terms and business/content requirements have been reviewed.
