# Protected Video Delivery Architecture V1

## Goal
Deliver purchased video without exposing the original storage location or relying on a permanent public URL.

## Storage model
- Original uploads are private.
- Public web roots must never contain original protected media.
- Storage credentials remain server-side.
- Media metadata references an internal asset ID rather than exposing storage paths.

## Access flow
1. Authenticated buyer requests playback for a product.
2. Server resolves the product and media asset.
3. Server checks the buyer's active entitlement.
4. Server checks product/media availability and access policy.
5. Server creates a short-lived access mechanism appropriate to the configured delivery backend.
6. Client receives only the minimum information needed for playback.

## Download policy
The product must distinguish between:
- streaming/playback access;
- authorized downloads, when the seller/operator enables them.

A seller cannot accidentally make a protected original public by changing a frontend field.

## Anti-abuse controls
Where appropriate, support:
- short-lived access;
- rate limiting;
- concurrent-session limits;
- access-event monitoring;
- buyer-specific watermarking/traceability as an optional feature.

## Reality check
No web application can guarantee prevention of screen recording or redistribution after legitimate access. The goal is to prevent unauthorized direct access, make abuse harder, and provide traceability and response mechanisms.

## Test requirements
- Direct storage URL is inaccessible publicly.
- Unauthenticated playback request is denied.
- Buyer without entitlement is denied.
- Buyer with revoked entitlement is denied.
- Valid buyer receives access only within the configured lifetime.
- Changing asset/product IDs cannot bypass authorization.
- Seller cannot expose a protected original through ordinary product-edit fields.
