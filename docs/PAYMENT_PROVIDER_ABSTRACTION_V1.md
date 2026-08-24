# Payment Provider Abstraction V1

## Goal
Keep the marketplace independent from one payment provider so the commercial product can support different providers, regions and future integrations without rewriting checkout and order logic.

## Boundary
The application owns:
- cart/order creation;
- trusted product pricing;
- currency rules;
- order state;
- entitlement state;
- refund/revocation state;
- provider-neutral payment status.

A provider adapter owns:
- checkout-session creation;
- provider-specific customer/payment identifiers;
- webhook verification;
- provider event normalization;
- provider-specific refund operations.

## Required normalized states
`pending`, `authorized`, `paid`, `failed`, `refunded`, `partially_refunded`, `cancelled`, `disputed`.

## Security
- Provider secrets remain server-side.
- Webhook signatures are verified before processing.
- Provider events are idempotent by provider event ID.
- Client redirects are never treated as proof of payment.
- Order totals are calculated from trusted server data.

## Currency
The checkout layer must support multiple currencies without hard-coding a single currency. Provider availability and supported currencies are configuration/provider dependent and must be surfaced clearly to the operator.

## PayPal and future providers
PayPal should fit through the same adapter boundary as other supported providers. Adding a provider must not change the buyer's order/entitlement model.

## Testing
Every adapter must pass:
- successful payment;
- failed payment;
- cancelled checkout;
- duplicate webhook;
- invalid webhook signature;
- refund;
- partial refund where supported;
- provider outage/timeouts;
- unsupported currency/provider configuration.
