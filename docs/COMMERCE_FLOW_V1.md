# Commerce Flow V1

## Goal
Define the first end-to-end commerce slice before live payment credentials are introduced.

## Buyer lifecycle
1. Browse catalog
2. Open product detail
3. Sign in/register when required
4. Confirm product, price, currency and delivery method
5. Create checkout session through a provider-neutral adapter
6. Complete sandbox payment
7. Verify the provider event server-side
8. Create immutable order record
9. Grant product entitlement
10. Show product in buyer library
11. Permit authorized streaming/download only

## Non-negotiable rules
- Never trust a client-side success page as proof of payment.
- Entitlements are granted only after verified server-side payment confirmation.
- Prices and currency are re-read server-side at checkout.
- Order totals are immutable once payment is confirmed.
- Refund/revocation must update entitlement state according to policy.
- Payment provider secrets never enter frontend code or Git history.
- Raw card data is never stored by the application.

## Provider-neutral boundary
The application should expose an internal interface with operations conceptually equivalent to:
- create checkout session
- retrieve checkout status
- verify webhook/event
- refund payment
- reconcile payment

A provider adapter implements those operations. This keeps the marketplace portable and allows payment options to vary by region and content category.

## Sandbox first
The first implementation must use a test/sandbox provider or deterministic mock adapter. Live credentials are not required for development and must never be committed.

## Next implementation slice
- Product-detail API
- Checkout-session API boundary
- Server-side price validation
- Order state model
- Entitlement state model
- Buyer library API
- Idempotent payment-event handling
- Audit events for order/payment/entitlement changes
