# Buyer Library V1

## Purpose
Provide a simple, reliable place where buyers can find and use the digital videos they have legitimately purchased.

## Library item
Each item should show:
- product title;
- thumbnail;
- seller name where appropriate;
- purchase date;
- current access status;
- available action (watch/download when permitted);
- useful status information when access is unavailable.

## Authorization
The library is not the source of truth for access. Every playback/download request must independently verify the authenticated user's active entitlement on the server.

## States
- empty library;
- active purchase;
- access revoked;
- access expired;
- product unavailable;
- media processing/pending;
- temporary delivery failure.

## UX
- Search and filtering should remain simple.
- Recently purchased items should be easy to find.
- Mobile cards should remain readable without horizontal scrolling.
- Failed playback should provide a clear retry/support path.
- Do not expose internal storage URLs or security implementation details.

## Privacy
A buyer must not be able to infer another buyer's library contents, purchase IDs or private account data through predictable URLs, pagination or API parameters.

## Tests
- Empty state renders correctly.
- Buyer sees only their own purchases.
- Changing pagination or item IDs cannot expose another buyer's data.
- Revoked/expired entitlement is reflected correctly.
- Playback still performs a fresh server-side authorization check.
- Mobile layout works for long titles and translated text.
