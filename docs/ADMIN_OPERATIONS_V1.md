# Admin Operations V1

## Goal
Allow a non-programmer operator to run routine marketplace operations from desktop or smartphone.

## Dashboard priorities
1. Action-required moderation items
2. Pending seller verification
3. Payment/order exceptions
4. Payout requests
5. Reported content/accounts
6. System health warnings
7. Sales overview

## No-code operations
- Approve/reject seller applications
- Review products
- Publish/unpublish products
- Handle reports and takedowns
- Review refunds according to policy
- Review payout requests
- Manage categories/tags
- Configure translations and currency display
- Configure region availability
- Edit policy/content pages
- View audit history

## Safety
Sensitive actions require explicit confirmation and, where appropriate, step-up authentication. Every privileged action is audited with actor, timestamp, target, action and outcome.

## Mobile requirement
Routine actions must work without horizontal scrolling. Tables should collapse into readable cards. Destructive actions must not be adjacent to common taps without confirmation.

## Next implementation
Add authenticated admin API routes, role/permission middleware, audit-event persistence and the first moderation/payout actions. Keep all provider credentials and infrastructure secrets outside the admin UI.
