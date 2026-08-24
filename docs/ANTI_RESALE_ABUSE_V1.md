# Anti-Resale / Abuse Protection V1

## Goal
Reduce unauthorized redistribution and account abuse without pretending that software can make piracy impossible.

## Threat model
The marketplace should assume that a legitimate buyer may attempt to:
- share account credentials;
- share purchase links or access tokens;
- copy public media URLs;
- download an authorized file and redistribute it;
- scrape catalog or protected endpoints;
- abuse refunds or payment disputes;
- automate account creation/purchasing;
- resell content without the creator's permission.

## Technical controls
### Authentication and sessions
- Strong password policy and secure password hashing.
- Optional/required MFA for operator and sensitive seller accounts.
- Short-lived sessions/access tokens where appropriate.
- Session revocation and device/session management.
- Rate limits for authentication and sensitive endpoints.

### Entitlements and media access
- Never expose permanent public media URLs for protected products.
- Generate short-lived, authorized playback/download access after entitlement checks.
- Verify account, entitlement, product status and regional policy on protected requests.
- Use signed URLs/tokens where supported by the storage/CDN architecture.
- Keep original media in private storage.
- Separate thumbnails/previews from protected originals.

### Download controls
Where the seller/product policy permits downloads:
- authorize every download request;
- issue short-lived access;
- rate-limit repeated downloads;
- record security-relevant download events;
- allow the operator to revoke access when a refund, takedown or policy action requires it.

No system should claim that downloaded files can be made impossible to copy after delivery.

### Watermarking / traceability
Support optional per-buyer visible or forensic watermarking for products where the operator chooses it. The architecture should permit product-specific watermark policy without requiring it for every product.

Recommended traceability fields include a non-secret order/entitlement identifier. Do not expose unnecessary personal data in a watermark.

### Abuse detection
Record security-relevant signals such as:
- unusual login activity;
- excessive failed authentication;
- abnormal download frequency;
- excessive concurrent sessions;
- repeated checkout/refund patterns;
- suspicious entitlement access;
- rapid account/device changes.

Signals should feed a review/risk workflow rather than automatically punish legitimate users solely from one heuristic.

### Anti-scraping
- Rate limiting and request throttling.
- Pagination limits.
- Authorization on private APIs.
- Avoid returning unnecessary internal identifiers or private metadata.
- Consider bot/WAF controls at deployment level.

## Rights and takedown workflow
The operator needs a clear mechanism to:
1. receive a report;
2. preserve relevant audit information;
3. temporarily restrict content when policy requires;
4. review seller/product evidence;
5. remove or restore content;
6. revoke affected entitlements when legally/policy appropriate;
7. notify relevant parties;
8. retain an audit trail.

## Seller protection
A seller must be able to report suspected unauthorized redistribution and identify the affected product/order without exposing private buyer data unnecessarily.

## Important limitation
No web application can guarantee prevention of screen recording, screenshots, cameras, copied downloaded files or redistribution outside the platform. The goal is layered deterrence, access control, traceability and rapid response.

## Acceptance tests
- Protected media cannot be fetched without a valid entitlement.
- Expired/revoked access token fails.
- Refunded entitlement no longer grants protected access according to policy.
- Region-restricted product is denied outside permitted regions.
- Repeated failed auth/download requests trigger configured throttling.
- Admin takedown immediately changes protected access according to policy.
- Audit events are created for security-sensitive actions.
- Secrets and permanent protected-media URLs never appear in frontend bundles or logs.
