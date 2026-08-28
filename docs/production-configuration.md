# Production Configuration

## Required runtime configuration

The current API requires the database and session secret to start safely:

- `DATABASE_URL` — PostgreSQL connection string.
- `SESSION_SECRET` — strong deployment-only secret.

`NODE_ENV=production` should be set in production. The application uses production mode when configuring the session cookie.

## Session security

Production session cookies must remain `HttpOnly`, `Secure`, `SameSite=Lax`, and scoped to `/`. Do not weaken these attributes to make a local integration work.

## Payment configuration

Configure payment-provider credentials and webhook signing secrets only in the deployment secret manager. Never put real credentials in `.env.example`, Git, frontend code, or browser-exposed configuration.

A payment return URL is not proof of payment. Granting an entitlement must remain tied to the verified payment webhook/event lifecycle.

## Media configuration

Production media storage must not be publicly readable. Protected streaming/download endpoints must enforce entitlement authorization before serving purchased media.

Keep production storage credentials server-side only.

## Reverse proxy / HTTPS

Terminate TLS at the production load balancer or reverse proxy and forward requests to the API over a trusted internal connection. Ensure the proxy preserves the original host/protocol information needed by the deployment.

Do not expose the PostgreSQL service or private media storage directly to the public internet.

## CORS

If the frontend and API are hosted on different origins in production, configure an explicit allowlist at the deployment layer or application middleware. Do not use a wildcard origin for authenticated browser traffic.

The allowed origin should be the exact production frontend origin.

## Rate limiting

Apply rate limiting at the edge/API gateway for authentication, checkout creation, report submission, upload initiation, and other abuse-sensitive endpoints. Tune limits using production traffic measurements rather than a guessed universal value.

## Secrets rotation

Rotate session/payment/storage credentials through the deployment secret manager. After rotating `SESSION_SECRET`, existing sessions may no longer remain valid depending on the deployed authentication strategy; plan rotation during a controlled maintenance window.

## Pre-release checklist

- [ ] `NODE_ENV=production`
- [ ] production `DATABASE_URL`
- [ ] strong unique `SESSION_SECRET`
- [ ] payment credentials stored as deployment secrets
- [ ] webhook signing secret configured
- [ ] private media storage configured
- [ ] exact frontend origin allowlisted if cross-origin
- [ ] edge/API rate limits enabled
- [ ] HTTPS enforced
- [ ] PostgreSQL not publicly exposed
- [ ] media storage not publicly readable
- [ ] backup schedule and restore test recorded
- [ ] privacy/legal documents reviewed for the deployment jurisdiction
