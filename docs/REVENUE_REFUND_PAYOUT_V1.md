# Revenue, Refund & Payout V1

## Goal
Give buyers, sellers and operators a transparent financial workflow while keeping payment-provider details behind a provider-neutral boundary.

## Financial lifecycle
`order_pending` -> `paid` -> `seller_earned` -> `payout_eligible` -> `payout_sent`

Alternative paths:
- `payment_failed`
- `cancelled`
- `refunded`
- `partially_refunded`
- `payout_held`
- `payout_failed`
- `disputed`

## Ledger principle
Money-related state must be represented by immutable transaction/ledger records rather than relying only on editable order fields. Corrections should be compensating records, not destructive edits.

## Seller earnings
For each eligible sale, retain enough information to explain:
- gross order amount;
- currency;
- applicable platform fee;
- applicable payment-provider fee when available;
- refunds/adjustments;
- seller net amount;
- payout status.

## Refund behavior
Refund processing must update the financial ledger and access entitlement according to the configured policy. A refund webhook must be idempotent.

## Payout safety
- Payout destinations are protected and never shown in full to ordinary users.
- Payout eligibility is server-side calculated.
- Suspended/flagged accounts can be placed on hold according to policy.
- Payout actions require appropriate permissions.
- Provider payout failures are recoverable and auditable.

## Buyer transparency
Before purchase, show final price and currency. After purchase, show order status and receipt information. If access changes because of a refund or dispute, explain the reason and next step without exposing internal provider data.

## Admin controls
Admin can inspect order, refund, ledger and payout status without editing historical financial records. High-impact actions require confirmation and are audited.

## Tests
- Client cannot alter the trusted order total.
- Duplicate payment/refund events do not duplicate financial records.
- Refunded orders cannot continue to generate payout eligibility.
- Payout cannot be triggered for an ineligible balance.
- Unauthorized admin/seller API calls are rejected.
- Currency is preserved correctly through order, refund and payout records.
