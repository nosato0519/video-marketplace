# Authentication & Authorization Implementation Spec V1

## Scope
Define the security boundary before adding login, seller dashboard and admin APIs.

## Identity
Every authenticated request resolves to a server-side user identity. Client-supplied `user_id`, `seller_id` or `role` is never trusted for authorization.

## Roles
- `buyer`
- `seller`
- `moderator`
- `admin`

Roles are server-side permissions, not UI labels.

## Session requirements
- Secure, HttpOnly session/token transport.
- SameSite policy appropriate to deployment.
- Explicit expiration and invalidation.
- No authentication secrets in URLs.
- Passwords, if used, are stored only as strong password hashes; plaintext passwords are never persisted or logged.

## Authorization
Use deny-by-default middleware and resource-level checks:
- buyer may read only their own private resources;
- seller may manage only resources they own;
- moderator/admin permissions are explicit;
- high-impact actions require the appropriate role and server-side checks.

## Object-level access test examples
- User A requesting User B's order -> deny.
- Seller A editing Seller B's product -> deny.
- Seller A using Seller B's asset ID -> deny.
- Buyer changing an order ID -> must not expose another order.
- Moderator calling an admin-only endpoint -> deny.

## Error behavior
Use safe, consistent public errors. Do not reveal whether unrelated private resources exist when that would create an information leak.

## Dependencies
The current backend package is intentionally small (Express, Helmet and PostgreSQL). Authentication implementation must add only reviewed, maintained dependencies and must be accompanied by integration tests before commercial release.

## Release gate
Authentication and authorization are not considered complete until cross-user and privilege-boundary tests pass against the actual API, not only helper functions.
