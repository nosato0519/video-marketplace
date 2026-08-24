# Buyer Library V1

## Purpose
Give buyers one reliable place to find every legitimately purchased product and continue watching or downloading according to the product's delivery policy.

## States
- Purchased / ready
- Processing
- Refund pending
- Refunded / access revoked
- Region restricted
- Temporarily unavailable

## Access rules
- A library item is backed by a server-side entitlement, not a browser flag.
- Every playback/download request checks the authenticated account and entitlement.
- Media URLs are short-lived or otherwise access-controlled; permanent public asset URLs are not the authorization mechanism.
- The UI explains unavailable states without exposing internal storage or provider details.

## UX
- Search and filter owned products.
- Show purchase date and current access state.
- Resume viewing where supported.
- Clear stream/download action based on the product policy.
- Mobile-first cards and a focused detail view.
- Accessible status announcements for purchase completion and access changes.

## Commerce integrity
The library is populated only after a verified payment event and successful entitlement creation. Repeated provider events must be idempotent and must not duplicate orders or entitlements.

## Next implementation
Connect the library to the order/entitlement API, then add authorization middleware for media delivery.
