# Security Baseline v0.1

Security is a release requirement, not a later enhancement.

## Identity
- Passwords must be handled by a vetted authentication mechanism with modern password hashing.
- Sessions must be protected against fixation and theft.
- Sensitive account changes require appropriate re-authentication or step-up verification.
- Admin and seller roles must be enforced server-side.

## Authorization
- Every protected API operation checks the authenticated identity and resource ownership/role.
- Seller A must never access Seller B's private assets or financial records.
- Buyers may access only purchases and private media they are authorized to access.
- Admin privileges are separated and auditable.

## Media protection
- Original uploads are stored privately.
- Browser clients receive authorized, time-limited playback/download access rather than permanent storage URLs.
- Download limits and expiry are enforced server-side.
- Upload processing must validate file type, size and safe handling requirements.

## Commerce security
- Never store raw card numbers or security codes.
- Verify payment webhooks and make handlers idempotent.
- Never mark an order paid solely from a browser redirect.
- Refunds and payouts require server-side state transitions.

## Application security
- Validate all untrusted input on the server.
- Encode untrusted text when rendering into HTML.
- Use CSRF protection where cookie-based state-changing requests are used.
- Apply rate limits to authentication, uploads, reports and other abuse-prone operations.
- Keep secrets outside source control.
- Log security-relevant events without storing unnecessary sensitive data.
- Keep dependencies patched and review security advisories.

## Privacy
- Collect only information necessary for operation and compliance.
- Define retention/deletion rules before launch.
- Do not expose unnecessary personal information in public seller/buyer profiles.
- Provide appropriate privacy and data-rights documentation for launch jurisdictions.

## Adult-content safeguards
If adult content is enabled, the production configuration must include appropriate age/access controls, consent and rights processes, prohibited-content rules, reporting/takedown procedures, seller verification requirements and jurisdiction restrictions. The exact requirements must be reviewed for every launch jurisdiction and provider.
