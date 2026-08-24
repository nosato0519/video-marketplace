# Buyer Commerce Slice V1

## Objective
Define the first complete vertical slice that turns the existing marketplace UI into a testable buyer transaction flow.

## Flow
1. Browse published products.
2. Open product detail.
3. Select a supported currency.
4. Start checkout.
5. Server calculates/validates the order total from trusted product data.
6. Payment provider confirms payment through a server-verified event.
7. Order is created exactly once.
8. Entitlement is granted exactly once.
9. Buyer sees the purchase in their library.
10. Protected media authorization checks the entitlement before issuing access.

## Required states
- product unavailable
- checkout loading
- payment pending
- payment failed
- payment succeeded
- duplicate payment event
- refunded/revoked access
- unauthorized media access
- expired/invalid media token
- empty library
- network/server failure

## Security rules
- Never trust client-submitted price, seller ID or entitlement state.
- Every order and entitlement lookup is scoped to the authenticated user.
- Payment webhooks are authenticated and idempotent.
- Media storage remains private.
- Media access is short-lived and authorization checked server-side.
- Secrets remain server-side.

## Test cases
### Buyer authorization
- User A cannot read User B's order by changing an ID.
- User A cannot read User B's library.
- User A cannot access protected media purchased by User B.

### Commerce integrity
- Client price modification is rejected/ignored.
- Failed payment creates no active entitlement.
- Duplicate provider event creates no duplicate order or entitlement.
- Refund/revocation follows configured access policy.

### UX
- Checkout cannot be double-submitted.
- Currency and final total are clear before confirmation.
- Every failure state gives a useful next step or support reference.

## Completion rule
This slice is complete only when the implementation and automated/integration/E2E security tests pass. UI-only completion is not sufficient.
