# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 386 — Buyer-facing content reporting UI and authenticated report API added.**

## Current status
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Public catalog/detail now excludes products with a blocked moderation review.
- Purchased media access policy now rejects unpublished/blocked products.
- Admin content moderation API is registered under `/api/admin`.
- Admin content moderation UI exists for reviews, reports and Takedown.
- Buyer product detail page now exposes a Report this content form with reason and detail fields.
- Buyer report submission is authenticated, validates allowed reasons and description length, verifies the product is published and prevents duplicate open/reviewing reports for the same buyer/product.
- Buyer reports are stored in `content_reports` for Admin review.
- Moderation actions are audited through `audit_events`.

## Next step
**Run and harden end-to-end moderation acceptance testing, then continue with account/privacy controls and production-readiness integration.**

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**