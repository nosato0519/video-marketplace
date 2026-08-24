# Observability V1

## Goal
Make failures diagnosable for the operator without exposing secrets or requiring developer knowledge.

## Health checks
Monitor separately:
- application availability;
- database connectivity;
- storage availability;
- queue/background processing when used;
- email delivery configuration;
- payment-provider connectivity;
- video-processing status.

## User-facing diagnostics
When a critical action fails, show:
- plain-language explanation;
- safe next step;
- support/reference ID.

Never show stack traces, credentials, SQL, internal paths or provider secrets to ordinary users.

## Logs
Structured logs should include useful correlation/request IDs and event type. Sensitive personal/payment data must be minimized or redacted.

## Audit events
Record important security and commerce events such as:
- login/security changes;
- seller approval/rejection;
- product publish/takedown;
- order/payment state changes;
- entitlement changes;
- refunds;
- payout actions;
- administrator permission changes.

## Alerts
The operator should be able to identify abnormal rates of:
- failed logins;
- payment failures;
- media authorization failures;
- upload/processing failures;
- application errors.

## Support workflow
Every support-worthy failure should be traceable from the user's reference ID to the relevant sanitized log/audit events. This reduces the need to ask customers to reproduce problems repeatedly.

## Privacy and retention
Define retention periods for logs and audit data. Collect only what is necessary for security, operations and dispute handling.

## Release requirement
Observability must be tested in failure scenarios, including database outage, storage failure, payment-provider failure, expired access, failed upload and background-job failure.
