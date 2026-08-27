# Video Marketplace Project State

## Purpose
A reusable, international video marketplace independently designed and implemented for general video sales, with adult-content capability only where legally and operationally permitted.

## Current milestone
**Milestone 387 — Buyer report API/storefront contract aligned; regression pipeline follow-up required.**

## Current status
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Public catalog/detail now excludes products with a blocked moderation review.
- Purchased media access policy now rejects unpublished/blocked products.
- Admin content moderation API is registered under `/api/admin`.
- Admin content moderation UI exists for reviews, reports and Takedown.
- Buyer product detail page exposes a Report this content form.
- Buyer report API is authenticated, validates allowed reasons and description length, verifies the product is published and prevents duplicate open/reviewing reports for the same buyer/product.
- Buyer report endpoint now accepts both the canonical `/api/products/:productId/reports` contract and the storefront-compatible `/api/content-reports` contract, and accepts both snake_case and camelCase reason fields.
- Buyer reports are stored in `content_reports` for Admin review.
- Moderation actions are audited through `audit_events`.
- The repository's Backend Regression workflow is configured to run `npm install` and `npm test` for backend changes.
- A prior Backend Regression run for the report-endpoint registration failed during `npm test`; the failure must be resolved/verified before treating moderation work as regression-clean.

## Next step
**Inspect/fix the Backend Regression test failure and add focused moderation regression coverage. Then verify the full report → Admin review → Takedown → public/media access flow.**

## Continuation rule
At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state without relying on chat history. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source.**