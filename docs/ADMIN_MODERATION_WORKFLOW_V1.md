# Admin Moderation & Operations Workflow V1

## Goal
Give a non-programmer administrator a safe, understandable control center for daily marketplace operations.

## Core areas
- dashboard and health status;
- seller approvals;
- product review queue;
- published product management;
- reports and abuse cases;
- users and role status;
- orders and refunds;
- payouts;
- audit log;
- security alerts;
- setup/configuration checklist.

## Moderation flow
1. New seller/product enters the review queue.
2. Admin sees required information and policy checks.
3. Admin can approve, reject with reason, request changes, suspend or restore according to permission.
4. Every sensitive action records actor, target, timestamp, previous state and new state where appropriate.
5. Seller sees a clear outcome and next step.

## Safety rules
- No destructive action should be one tap without confirmation.
- High-impact actions require an explicit confirmation showing what will change.
- Admin UI must never expose secrets.
- Permission checks are enforced server-side; hiding a button is not authorization.
- Sensitive data is limited by role.

## Mobile administration
Core daily actions must work on a phone:
- review a product;
- approve/reject;
- suspend/restore;
- review a report;
- inspect an order;
- view payout status;
- see system health and critical alerts.

Complex bulk operations may remain desktop-first but must remain usable and safe.

## Incident support
For security or service incidents, the dashboard should provide a reference ID and links to sanitized audit/log context, without exposing internal secrets or unnecessary personal data.

## Acceptance tests
- Seller cannot approve their own content when policy requires separation.
- Moderator cannot perform administrator-only actions.
- Suspended product cannot be purchased or newly accessed according to policy.
- Refund/revocation state is reflected in buyer access.
- Every critical moderation action appears in the audit trail.
- Unauthorized API calls are rejected even when made outside the UI.
- Mobile core workflows remain usable.
