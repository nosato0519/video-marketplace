# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 389 — Fixed concrete Backend Regression failures in routing/media/payment boundaries.**

## Current status
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Public catalog/detail excludes products with a blocked moderation review.
- Purchased media access rejects unpublished/blocked products.
- Admin content moderation API/UI exists for reviews, reports and Takedown.
- Buyer product detail exposes a Report this content form and authenticated report API.
- Moderation actions are audited through `audit_events`.
- Backend Regression runs `npm install` and `npm test`.
- Fixed Express 5 test assumptions that referenced the removed `app._router` property; tests now assert `app.router`.
- Registered the existing purchase-intent route in the main API server.
- Restored protected-media repository compatibility by exporting `getProtectedMediaForUser` as the canonical context lookup and returning moderation/media-asset fields needed by downstream authorization.
- Purchased-media policy now treats both `content_blocked` and `moderation_status=blocked` as deny conditions.
- Pending payment initiation is provider-neutral and no longer requires PostgreSQL merely to construct the development/test payload.
- Stripe configuration errors now identify the provider (`payment_provider_not_configured:stripe`) while payment validation helpers remain intact.

## Verified CI findings from the latest Backend Regression run
The latest completed run had 168 tests: 152 passed, 5 skipped and 11 failed. The failures were concrete compatibility/configuration issues, not moderation-policy test failures. Key failures included Express 5 `app._router` assumptions, missing protected-media repository export, missing provider-specific Stripe error detail, a DB-dependent pending-payment test, and payment-provider settings/routing tests whose expectations no longer matched the owner-scoped configuration model.

## Remaining work
- Re-run Backend Regression after Milestone 389 and inspect the new result; do not claim green until the actual run is successful.
- If failures remain, fix the first concrete failure and repeat.
- Update any remaining payment-provider tests to match the owner-scoped, credential-safe configuration model without weakening production isolation.
- Add DB-backed integration coverage for buyer report creation, Admin report processing, Takedown and blocked catalog/detail/media access.
- Complete production authentication/session, privacy/account controls, region restrictions and PostgreSQL acceptance testing.
- Complete product checkout/library end-to-end testing and production payment/provider compatibility review.
- Finish clean-install, backup/restore, licensing, documentation and commercial ZIP acceptance testing.

## Next step
**Inspect the Backend Regression run triggered by Milestone 389. If it is still red, take the first actual failing test from the CI log and fix that exact issue before adding more features.**

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**