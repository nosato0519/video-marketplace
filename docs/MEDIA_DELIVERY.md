# Media delivery architecture v0.1

## Goal
Video files must not be exposed as permanent public storage URLs. The application should authorize access and issue short-lived delivery URLs/tokens through a private storage/CDN layer.

## Product policies
Each product can support:
- streaming only;
- streaming + download;
- download limits;
- download expiry;
- preview access without purchase.

## Delivery flow
1. Buyer requests playback/download.
2. API authenticates the user.
3. API checks product status and purchase entitlement.
4. API checks region/content policy and media readiness.
5. API records an access event where appropriate.
6. API issues a short-lived signed delivery URL/token.
7. Client retrieves the media through the delivery layer.

## Seller upload flow
1. Seller creates a draft product.
2. API creates an upload session for an approved seller.
3. Upload goes to private object storage using a short-lived signed upload mechanism.
4. Media processing/transcoding runs asynchronously.
5. The media remains unavailable until processing and moderation checks succeed.
6. Seller submits the product for moderation.
7. Only approved/published content becomes purchasable.

## Security requirements
- Storage buckets/objects remain private.
- Signed URLs/tokens are short-lived and scoped to the requested asset/action.
- Never trust a product ID from the browser as proof of entitlement.
- Downloads must enforce product policy server-side.
- Media status must be checked before delivery.
- Deleted/blocked content must immediately stop new delivery authorization.
- Access logs must avoid storing unnecessary sensitive information.

## Adult content
If adult content is enabled, the delivery service must additionally enforce the platform's age/region/content eligibility checks before granting access. Payment eligibility and media eligibility are separate checks.
