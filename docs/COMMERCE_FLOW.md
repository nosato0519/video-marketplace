# Commerce flow v0.1

The marketplace must be able to trace money from checkout through seller settlement without relying on browser redirects.

## Order lifecycle
1. Buyer selects product(s).
2. Server validates product availability, price and region/content eligibility.
3. Server creates a pending order and immutable order-item price snapshot.
4. Payment provider checkout is initiated.
5. Provider webhook is verified server-side.
6. Idempotent payment event processing moves the payment/order to paid.
7. Buyer access is granted only from verified paid state.
8. Seller settlement is calculated from the stored order-item snapshot.
9. Settlement becomes available according to the platform's refund/dispute/hold policy.
10. Seller payout is executed through the configured payout provider.

## Important accounting rule
Current platform fee settings must never be used to recalculate an old order. The order item stores the amounts used for that transaction so historical accounting remains stable.

## Payment provider abstraction
The application must expose a provider-neutral payment interface. A provider adapter is responsible for checkout creation, webhook verification, refund operations and provider identifiers. Business logic must not depend on one provider's API shape.

## Adult-content compatibility
Provider support must be verified against the actual content category, countries, merchant entity and payout model before activation. The system must support disabling a provider or payment method for specific categories/regions.

## No live credentials yet
This milestone defines the accounting foundation only. No live payment integration should be considered complete until provider terms, supported countries/currencies, content restrictions, merchant requirements and sandbox tests are completed.
