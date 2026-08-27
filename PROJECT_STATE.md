# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 388 — Added focused moderation report-policy regression coverage.**

## Current status
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Public catalog/detail now excludes products with a blocked moderation review.
- Purchased media access policy now rejects unpublished/blocked products.
- Admin content moderation API is registered under `/api/admin`.
- Admin content moderation UI exists for reviews, reports and Takedown.
- Buyer product detail page exposes a Report this content form.
- Buyer report API is authenticated, validates allowed reasons and description length, verifies the product is published and prevents duplicate open/reviewing reports for the same buyer/product.
- Buyer report endpoint supports the storefront `/api/content-reports` contract and the canonical product-report contract where applicable.
- Buyer reports are stored in `content_reports` for Admin review.
- Moderation actions are audited through `audit_events`.
- Backend Regression is configured to run `npm install` and `npm test` for backend changes.
- Added `backend/src/moderation/report-policy.test.js` covering authentication/roles, resolution-note requirements, dismiss/resolve decisions, invalid/closed reports and resource-status actions.

## Remaining work
- Verify/fix the actual Backend Regression failure from the earlier report-endpoint registration change.
- Ensure the new moderation tests run cleanly under the repository's current Node test glob.
- Add integration coverage for buyer report creation, Admin report processing, Takedown and blocked catalog/detail/media access.
- Complete production authentication/session, privacy/account controls, region restrictions and PostgreSQL acceptance testing.
- Complete product checkout/library end-to-end testing and production payment/provider compatibility review.
- Finish clean-install, backup/restore, licensing, documentation and commercial ZIP acceptance testing.

## Next step
**Inspect the failing Backend Regression run/logs and correct the first concrete failure; then run the focused moderation tests and expand into DB-backed integration coverage.**

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**