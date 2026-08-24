# Payment Webhook Security Tests V1

- Requests without a valid signature are rejected.
- Invalid-length signatures are rejected without timing-unsafe comparison errors.
- Unknown event IDs are not processed twice.
- A browser redirect alone never marks an order as paid.
- Client-supplied price cannot change the server-side order amount.
- A webhook must reference a known provider payment identifier.
- A successful payment event is processed idempotently.
- Failed/cancelled/refunded events do not create an active entitlement.
- Entitlement creation is tied to the verified order and buyer, not arbitrary request fields.
