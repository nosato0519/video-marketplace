# Implementation Next — 2026-08-25

## Verified baseline
The current API exposes a public catalog endpoint backed by PostgreSQL. Catalog queries already enforce published-product and active-seller filtering, use parameterized SQL values, and cap the requested page size at 50. fileciteturn131file0L2-L2

The database layer requires `DATABASE_URL` and uses a bounded connection pool with connection/idle timeouts. fileciteturn132file0L2-L2

## Immediate implementation order
1. Authentication and session model.
2. Authorization middleware and resource ownership checks.
3. User/seller/admin persistence.
4. Product draft/upload state machine.
5. Order and payment state machine.
6. Entitlement creation/revocation.
7. Protected media endpoint.
8. Admin moderation and audit events.
9. Automated integration tests around every authorization boundary.

## Quality constraints
- Preserve parameterized database access.
- Keep public catalog read-only.
- Never trust client-provided seller/user IDs for authorization.
- Never treat a browser redirect as payment proof.
- Never expose private media storage URLs.
- Add tests before declaring each high-risk domain complete.

## Definition of progress
A milestone is complete only when the implementation exists in the repository and has focused tests or an explicit documented reason why a test cannot yet run in the current environment.
