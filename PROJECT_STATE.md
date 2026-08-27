# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 390 — Fixed concrete media-route and payment-contract regression issues; awaiting fresh CI result.**

## Current status
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Public catalog/detail excludes products with a blocked moderation review.
- Purchased media access rejects unpublished/blocked products.
- Admin content moderation API/UI exists for reviews, reports and Takedown.
- Buyer product detail exposes a Report this content form and authenticated report API.
- Moderation actions are audited through `audit_events`.
- Backend Regression runs `npm install` and `npm test`.
- Protected media route now injects its context reader, so route tests can exercise the HTTP boundary without touching PostgreSQL.
- Media download/protected-media fixtures now include the required product-to-asset and entitlement ownership fields instead of weakening authorization rules.
- Payment checkout validation restores the established `checkout_*` error contract and explicitly rejects mismatched order metadata.
- Payment-provider settings tests now use the owner-scoped API and correct list/object return shapes.
- Owner payment-routing test uses isolated test-only Stripe configuration; it does not persist or expose credentials.

## Latest CI baseline before Milestone 390
The latest completed Backend Regression run checked commit `1be195d166f1685e526c39db044ad781f545d4b0` and reported 169 tests: 153 passed, 5 skipped and 11 failed. The concrete failures included two protected-media route tests caused by the route ignoring its injectable context reader, two download tests caused by incomplete fixtures, one protected-media service fixture mismatch, one owner-routing configuration mismatch, two owner-scoped provider-settings test mismatches, and three payment validation contract mismatches. These have now been addressed in Milestone 390.

## Remaining work
- Wait for/inspect the Backend Regression run triggered by Milestone 390 and verify the exact result.
- Do not claim green until the actual latest run is successful.
- If failures remain, fix the first concrete failure and repeat.
- Add DB-backed integration coverage for buyer report creation, Admin report processing, Takedown and blocked catalog/detail/media access.
- Complete production authentication/session, privacy/account controls, region restrictions and PostgreSQL acceptance testing.
- Complete product checkout/library end-to-end testing and production payment/provider compatibility review.
- Finish clean-install, backup/restore, licensing, documentation and commercial ZIP acceptance testing.

## Next step
**Inspect the new Backend Regression run for Milestone 390. If red, fix the first actual remaining failure from its log. If green, record the green baseline and proceed to DB-backed moderation integration tests.**

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**