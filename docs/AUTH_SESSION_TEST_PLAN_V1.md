# Authentication Session Test Plan V1

## Required tests
- Login creates a high-entropy session token.
- Only the token hash is persisted.
- Session cookie is HttpOnly.
- Production cookie is Secure.
- Session uses an explicit SameSite policy.
- Expired session is rejected.
- Revoked session is rejected.
- Logout invalidates the session server-side.
- Changing a client-side role/user identifier cannot change identity.
- Suspended/disabled users cannot authenticate into protected workflows.
- Cross-user resource access is rejected by server-side authorization.

## Non-negotiable
Authentication is not complete when a login form works. It is complete only when session lifecycle, invalidation and object-level authorization are tested against the API.
