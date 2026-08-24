# Admin mobile UX requirements v0.1

The operator/admin experience must be fully usable from a modern smartphone, not merely responsive enough to display.

## Mobile-first admin priorities
- Dashboard summary: sales, pending reviews, reports, payout issues, system alerts.
- Seller moderation: review/approve/request changes/block with confirmation.
- Product moderation: preview metadata/status and take action.
- Orders: inspect order state and payment/refund status.
- Support: view and resolve common reports.
- Security: inspect recent security events and critical alerts.
- Settings: make safe low-risk configuration changes from mobile.

## Safety
- High-risk actions require re-authentication or step-up authentication where appropriate.
- Destructive actions require explicit confirmation and explain consequences.
- Sensitive values should be masked by default.
- Never expose payment secrets or private media credentials in the admin UI.
- Administrative actions must be logged with actor, target, action, timestamp and outcome.

## Mobile interaction rules
- Touch targets must be comfortably tappable.
- Avoid dense desktop-only tables; use cards/details with optional compact tables.
- Filters should be usable one-handed.
- Long-running operations show progress and allow safe navigation away when possible.
- Important alerts remain visible until acknowledged.
- Preserve unsaved form work where safe.

## Offline/poor connection
The UI should clearly distinguish stale cached information from live data. Actions that require live server confirmation must not pretend to have succeeded while offline.

## Role separation
The mobile admin UI must enforce the same server-side authorization as desktop. Hiding a button is never considered authorization.
