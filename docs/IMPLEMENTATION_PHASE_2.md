# Implementation Phase 2

## Priority order

The project now moves from specification-heavy work into the first integrated application slice.

### P0 — Core commerce
1. Authentication/session foundation
2. Product catalog and product-detail API
3. Server-side pricing/currency validation
4. Provider-neutral checkout boundary
5. Order state model
6. Idempotent payment-event handling
7. Entitlement state model
8. Buyer library
9. Protected media authorization

### P1 — Seller operations
10. Seller onboarding
11. Draft product creation
12. Resumable upload state
13. Product review/submission
14. Publish/reject/suspend states
15. Seller sales and payout views

### P1 — Administration
16. Role/permission middleware
17. Moderation queue
18. Order/refund review
19. Payout review
20. Audit log viewer
21. Setup checklist and health diagnostics

### P1 — Trust & safety
22. Report workflow
23. Takedown/restoration workflow
24. Account suspension workflow
25. Abuse-rate controls
26. Seller redistribution report

### P2 — Distribution product
27. Guided installer
28. Environment validation
29. Backup/restore tooling and documentation
30. Update/migration flow
31. Clean-install test package

## Rule
Each completed slice must have tests and a small Git commit. Do not mark the release ready until the release acceptance checklist is actually verified in a clean environment.

## Current objective
Complete the P0 buyer commerce slice before expanding the feature surface further. This creates a working vertical slice that can be tested end-to-end instead of accumulating disconnected screens.
