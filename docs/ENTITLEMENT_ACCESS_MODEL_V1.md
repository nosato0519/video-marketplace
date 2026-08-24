# Entitlement & Protected Media Access Model V1

## Purpose
Define the server-side rule that determines whether a buyer may access a purchased video.

## Principle
A successful payment does not mean the browser receives permanent media credentials. The server creates an entitlement after verified payment and evaluates that entitlement whenever protected media access is requested.

## Entitlement fields
- buyer/user ID
- product ID
- order ID
- status: active, revoked, expired
- granted_at
- expires_at (nullable)
- revocation_reason (nullable)

## Authorization flow
1. Authenticate the requesting user.
2. Resolve the requested product/media asset server-side.
3. Load the user's entitlement for that product.
4. Verify entitlement status and any expiry.
5. Apply product/access policy.
6. Issue short-lived media access only after authorization succeeds.
7. Record security-relevant access events without storing unnecessary personal data.

## Deny by default
Access is denied when:
- the user is unauthenticated;
- no matching entitlement exists;
- entitlement is revoked or expired;
- the product is unavailable under the configured policy;
- the media asset does not belong to the requested product;
- the access token is invalid, expired or reused outside its policy.

## Security tests
- User A cannot access User B's purchased media.
- Changing product/media IDs does not bypass entitlement checks.
- Revocation takes effect according to policy.
- Expired tokens are rejected.
- Direct storage URLs do not expose private originals.
- Entitlement creation is idempotent.

## Operational note
This control reduces unauthorized account/API access and uncontrolled direct media exposure. It cannot guarantee prevention of screen recording or redistribution after an authorized user receives content.
